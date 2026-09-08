import { Prisma, type ShortcutToken, SplitType, type User } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

import { DEFAULT_CATEGORY, isCategoryItem } from '~/lib/category';
import {
  deserializeDefaultSplit,
  parseSerializedDefaultSplit,
  toSortedFriendPair,
} from '~/lib/defaultSplit';
import { CURRENCIES, type CurrencyCode, isCurrencyCode } from '~/lib/currency';
import { cleanMerchantName, suggestCategoryFromMerchant } from '~/lib/merchantCategory';
import { db } from '~/server/db';
import { env } from '~/env';
import {
  type ShortcutSplitTarget,
  buildShortcutParticipants,
  deriveIdempotencyKey,
  normalizeAmountInput,
} from '~/lib/shortcutExpense';
import type { ShortcutExpenseInput, ShortcutExpenseResponse } from '~/types/shortcut.types';
import { getCurrencyHelpers } from '~/utils/numbers';

import { createExpense } from './splitService';

const TOKEN_SCHEME = 'spk';
const TOKEN_BYTES = 32;
const TOKEN_PREFIX_LENGTH = 12;

/**
 * A shortcut that fires twice for one purchase (iOS does that occasionally) sends
 * the same merchant/amount seconds apart. The derived idempotency key buckets by
 * minute, which is not enough on its own when the two runs straddle a minute
 * boundary, so recent identical expenses are also treated as duplicates.
 */
const RECENT_DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

export class ShortcutError extends Error {
  readonly status: number;

  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ShortcutError';
    this.status = status;
    this.code = code;
  }
}

export const hashShortcutToken = (rawToken: string): string =>
  createHash('sha256').update(rawToken).digest('hex');

export const generateShortcutToken = () => {
  const rawToken = `${TOKEN_SCHEME}_${randomBytes(TOKEN_BYTES).toString('base64url')}`;

  return {
    rawToken,
    tokenHash: hashShortcutToken(rawToken),
    tokenPrefix: rawToken.slice(0, TOKEN_PREFIX_LENGTH),
  };
};

/** Reads the token out of `Authorization: Bearer ...` or `X-SplitPro-Token`. */
export const extractShortcutToken = (headers: {
  authorization?: string;
  token?: string;
}): string | null => {
  const bearer = headers.authorization?.trim();
  if (bearer?.toLowerCase().startsWith('bearer ')) {
    return bearer.slice('bearer '.length).trim() || null;
  }

  return headers.token?.trim() || null;
};

export type AuthenticatedShortcutToken = ShortcutToken & { user: User };

export const authenticateShortcutToken = async (
  rawToken: string,
): Promise<AuthenticatedShortcutToken> => {
  const token = await db.shortcutToken.findUnique({
    where: { tokenHash: hashShortcutToken(rawToken) },
    include: { user: true },
  });

  if (!token || token.revokedAt) {
    throw new ShortcutError(401, 'INVALID_TOKEN', 'Unknown or revoked token');
  }

  return token;
};

interface ResolvedTarget extends ShortcutSplitTarget {
  type: 'group' | 'friend';
  name: string;
  groupId: number | null;
}

const resolveGroupTarget = async (groupId: number, userId: number): Promise<ResolvedTarget> => {
  const group = await db.group.findFirst({
    where: { id: groupId, groupUsers: { some: { userId } } },
    include: { groupUsers: { include: { user: true } }, groupDefaultSplit: true },
  });

  if (!group) {
    throw new ShortcutError(404, 'GROUP_NOT_FOUND', 'Group not found or you are not a member');
  }

  if (group.archivedAt) {
    throw new ShortcutError(409, 'GROUP_ARCHIVED', `Group "${group.name}" is archived`);
  }

  const defaultSplit = deserializeDefaultSplit(
    group.groupDefaultSplit &&
      parseSerializedDefaultSplit(
        group.groupDefaultSplit.splitType,
        group.groupDefaultSplit.shares,
      ),
  );

  return {
    type: 'group',
    name: group.name,
    groupId: group.id,
    splitType: defaultSplit?.splitType ?? SplitType.EQUAL,
    shares: defaultSplit?.shares ?? null,
    participants: group.groupUsers.map(({ user }) => user),
  };
};

const resolveFriendTarget = async (friendId: number, user: User): Promise<ResolvedTarget> => {
  const friend = await db.user.findUnique({ where: { id: friendId } });

  if (!friend) {
    throw new ShortcutError(404, 'FRIEND_NOT_FOUND', 'Friend not found');
  }

  const [userAId, userBId] = toSortedFriendPair(user.id, friend.id);
  const friendDefaultSplit = await db.friendDefaultSplit.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });

  const defaultSplit = deserializeDefaultSplit(
    friendDefaultSplit &&
      parseSerializedDefaultSplit(friendDefaultSplit.splitType, friendDefaultSplit.shares),
  );

  return {
    type: 'friend',
    name: friend.name ?? friend.email ?? `#${friend.id}`,
    groupId: null,
    splitType: defaultSplit?.splitType ?? SplitType.EQUAL,
    shares: defaultSplit?.shares ?? null,
    participants: [user, friend],
  };
};

const resolveTarget = async (
  token: AuthenticatedShortcutToken,
  requestedGroupPublicId?: string,
): Promise<ResolvedTarget> => {
  if (requestedGroupPublicId) {
    const group = await db.group.findUnique({
      where: { publicId: requestedGroupPublicId },
      select: { id: true },
    });

    if (!group) {
      throw new ShortcutError(404, 'GROUP_NOT_FOUND', 'No group with that id');
    }

    return resolveGroupTarget(group.id, token.userId);
  }

  if (null !== token.groupId) {
    return resolveGroupTarget(token.groupId, token.userId);
  }

  if (null !== token.friendId) {
    return resolveFriendTarget(token.friendId, token.user);
  }

  throw new ShortcutError(
    409,
    'NO_TARGET',
    'This token has no target left. Create a new one from the app.',
  );
};

const resolveCurrency = (input: ShortcutExpenseInput, user: User): CurrencyCode => {
  const currency = (input.currency ?? user.defaultCurrency ?? user.currency).toUpperCase();

  if (!isCurrencyCode(currency)) {
    throw new ShortcutError(400, 'INVALID_CURRENCY', `Unknown currency "${currency}"`);
  }

  return currency;
};

const resolveCategory = (
  input: ShortcutExpenseInput,
  merchant: string,
): { category: string; suggested: string; source: ShortcutExpenseResponse['categorySource'] } => {
  const { category: suggested } = suggestCategoryFromMerchant(merchant);

  if (input.category) {
    if (!isCategoryItem(input.category)) {
      throw new ShortcutError(400, 'INVALID_CATEGORY', `Unknown category "${input.category}"`);
    }

    return { category: input.category, suggested, source: 'request' };
  }

  return {
    category: suggested,
    suggested,
    source: DEFAULT_CATEGORY === suggested ? 'fallback' : 'suggestion',
  };
};

const resolveExpenseDate = (date?: string): Date => {
  if (!date) {
    return new Date();
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    throw new ShortcutError(400, 'INVALID_DATE', `Could not read the date "${date}"`);
  }

  return parsed;
};

const findExistingEntry = async (
  userId: number,
  idempotencyKey: string,
  {
    merchant,
    amount,
    currency,
    force,
  }: { merchant: string; amount: bigint; currency: string; force: boolean },
) => {
  const byKey = await db.shortcutExpense.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
    include: { expense: true },
  });

  if (byKey) {
    return byKey;
  }

  if (force) {
    return null;
  }

  return db.shortcutExpense.findFirst({
    where: {
      userId,
      rawMerchant: merchant,
      createdAt: { gte: new Date(Date.now() - RECENT_DUPLICATE_WINDOW_MS) },
      expense: { amount, currency, deletedAt: null },
    },
    include: { expense: true },
    orderBy: { createdAt: 'desc' },
  });
};

/** Records that the token was used, whatever the outcome of the request. */
export const touchShortcutToken = async (tokenId: string): Promise<void> => {
  await db.shortcutToken.update({ where: { id: tokenId }, data: { lastUsedAt: new Date() } });
};

export const addExpenseFromShortcut = async (
  token: AuthenticatedShortcutToken,
  input: ShortcutExpenseInput,
): Promise<ShortcutExpenseResponse> => {
  const { user } = token;
  const currency = resolveCurrency(input, user);
  const { toSafeBigInt, toUIString } = getCurrencyHelpers({ currency });
  const amount = toSafeBigInt(
    normalizeAmountInput(input.amount, CURRENCIES[currency].decimalDigits),
  );

  if (0n >= amount) {
    throw new ShortcutError(400, 'INVALID_AMOUNT', `Could not read the amount "${input.amount}"`);
  }

  const expenseDate = resolveExpenseDate(input.date);
  const target = await resolveTarget(token, input.group);
  const { category, suggested, source } = resolveCategory(input, input.merchant);
  const name = cleanMerchantName(input.merchant);
  const idempotencyKey =
    input.idempotencyKey ??
    deriveIdempotencyKey({
      tokenId: token.id,
      merchant: input.merchant,
      amount,
      currency,
      expenseDate,
    });

  const describe = (
    prefix: string,
    expenseId: string | null,
    duplicate: boolean,
    dryRun: boolean,
  ): ShortcutExpenseResponse => ({
    ok: true,
    duplicate,
    dryRun,
    expenseId,
    name,
    amount: toUIString(amount),
    currency,
    category,
    categorySource: source,
    target: { type: target.type, name: target.name },
    message: `${prefix} ${name} · ${toUIString(amount)} → ${target.name}`,
    url: expenseId ? `${env.NEXTAUTH_URL.replace(/\/$/, '')}/expenses/${expenseId}` : null,
  });

  const existing = await findExistingEntry(user.id, idempotencyKey, {
    merchant: input.merchant,
    amount,
    currency,
    force: input.force,
  });

  if (existing) {
    return describe('Already added:', existing.expenseId, true, false);
  }

  if (input.dryRun) {
    return describe('Would add:', null, false, true);
  }

  const { splitType, participants } = buildShortcutParticipants(target, user, amount, expenseDate);

  const expense = await createExpense(
    {
      groupId: target.groupId,
      paidBy: user.id,
      name,
      category,
      amount,
      splitType,
      currency,
      participants,
      expenseDate,
    },
    user.id,
  );

  try {
    await db.shortcutExpense.create({
      data: {
        tokenId: token.id,
        userId: user.id,
        idempotencyKey,
        expenseId: expense.id,
        rawMerchant: input.merchant,
        suggestedCategory: suggested,
        categoryOverridden: 'request' === source,
      },
    });
  } catch (error) {
    // Another run of the same shortcut won the race between the lookup above and
    // this insert: drop the expense just created and hand back the original one.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      'P2002' === error.code &&
      undefined !== expense.id
    ) {
      await db.expense.delete({ where: { id: expense.id } });

      const winner = await db.shortcutExpense.findUnique({
        where: { userId_idempotencyKey: { userId: user.id, idempotencyKey } },
      });

      return describe('Already added:', winner?.expenseId ?? null, true, false);
    }

    throw error;
  }

  return describe('Added:', expense.id, false, false);
};
