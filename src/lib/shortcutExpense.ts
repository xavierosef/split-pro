import { SplitType, type User } from '@prisma/client';
import { createHash } from 'node:crypto';

import {
  type Participant,
  type SplitShares,
  calculateParticipantSplit,
  initSplitShares,
} from '~/store/addStore';

/**
 * The pure half of the shortcut expense flow: how an amount is split across the
 * participants, and how a transaction becomes an idempotency key. No database and
 * no request context, so both are directly testable.
 */

export interface ShortcutSplitTarget {
  splitType: SplitType;
  /** Default-split shares by user id, or null for an equal split. */
  shares: Record<number, bigint> | null;
  participants: User[];
}

/**
 * Splits `amount` across the target's participants the same way the app does, by
 * reusing the store's split calculation. An unusable default split (shares that no
 * longer add up, a member who left) falls back to an equal split.
 */
export const buildShortcutParticipants = (
  target: ShortcutSplitTarget,
  paidBy: User,
  amount: bigint,
  expenseDate: Date,
): { splitType: SplitType; participants: { userId: number; amount: bigint }[] } => {
  const computeWith = (splitType: SplitType, shares: Record<number, bigint> | null) => {
    const participants: Participant[] = target.participants;
    const defaultShare = SplitType.EQUAL === splitType ? 1n : 0n;

    const splitShares = participants.reduce<SplitShares>((acc, participant) => {
      acc[participant.id] = {
        ...initSplitShares(),
        [splitType]: shares?.[participant.id] ?? defaultShare,
      };
      return acc;
    }, {});

    return calculateParticipantSplit({
      amount,
      participants,
      splitType,
      splitShares,
      paidBy,
      expenseDate,
      isNegative: false,
    });
  };

  const withDefaultSplit = computeWith(target.splitType, target.shares);

  const { splitType, result } = withDefaultSplit.canSplitScreenClosed
    ? { splitType: target.splitType, result: withDefaultSplit }
    : { splitType: SplitType.EQUAL, result: computeWith(SplitType.EQUAL, null) };

  return {
    splitType,
    participants: result.participants.map((participant) => ({
      userId: participant.id,
      amount: participant.amount ?? 0n,
    })),
  };
};

/**
 * Idempotency key derived from the transaction itself, for shortcuts that have no
 * transaction id to send (the Wallet trigger does not expose one). Bucketing the
 * date to the minute makes a re-run of the same automation land on the same key.
 */
export const deriveIdempotencyKey = ({
  tokenId,
  merchant,
  amount,
  currency,
  expenseDate,
}: {
  tokenId: string;
  merchant: string;
  amount: bigint;
  currency: string;
  expenseDate: Date;
}): string => {
  const minute = new Date(expenseDate).toISOString().slice(0, 16);
  const normalizedMerchant = merchant.trim().toUpperCase().replace(/\s+/g, ' ');

  return createHash('sha256')
    .update([tokenId, normalizedMerchant, amount.toString(), currency, minute].join('|'))
    .digest('hex');
};

/**
 * Turns whatever the shortcut sent into something `toSafeBigInt` can read.
 *
 * A shortcut has no idea what a locale is: on a French phone the Wallet amount
 * arrives as `12,34`, elsewhere as `12.34`, and either may carry group separators.
 * The separator closest to the end is the decimal one, unless what follows it looks
 * like a group of three digits that the currency has no room for.
 *
 * The sign is dropped: the Wallet trigger reports some cards' purchases as negative,
 * and a refund cannot be told apart from a purchase, so it is treated as one.
 */
export const normalizeAmountInput = (value: string | number, decimalDigits: number): string => {
  if ('number' === typeof value) {
    return Math.abs(value).toString();
  }

  const cleaned = value.replace(/[^\d.,]/g, '');
  const decimalIndex = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'));

  if (-1 === decimalIndex) {
    return cleaned;
  }

  const stripSeparators = (part: string) => part.replace(/[.,]/g, '');
  const integerPart = stripSeparators(cleaned.slice(0, decimalIndex));
  const fractionPart = stripSeparators(cleaned.slice(decimalIndex + 1));

  // `1.234` in a two-decimal currency is one thousand two hundred, not 1.234.
  if (3 === fractionPart.length && 3 !== decimalDigits) {
    return `${integerPart}${fractionPart}`;
  }

  return `${integerPart}.${fractionPart}`;
};
