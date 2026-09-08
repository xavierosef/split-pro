import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { generateShortcutToken } from '~/server/api/services/shortcutService';
import { suggestCategoryFromMerchant } from '~/lib/merchantCategory';

const MAX_TOKENS_PER_USER = 20;
const RECENT_EXPENSES_LIMIT = 50;

const targetSchema = z.union([
  z.object({ type: z.literal('group'), groupId: z.number() }),
  z.object({ type: z.literal('friend'), friendId: z.number() }),
]);

export const shortcutRouter = createTRPCRouter({
  getTokens: protectedProcedure.query(async ({ ctx }) => {
    // `tokenHash` is deliberately left out: it never needs to reach the client.
    const tokens = await ctx.db.shortcutToken.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        friendId: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
        group: { select: { id: true, name: true } },
        _count: { select: { expenses: true } },
      },
    });

    const friendIds = tokens.map((token) => token.friendId).filter((id) => null !== id);
    const friends = await ctx.db.user.findMany({
      where: { id: { in: friendIds } },
      select: { id: true, name: true, email: true },
    });
    const friendMap = new Map(friends.map((friend) => [friend.id, friend]));

    return tokens.map((token) => ({
      id: token.id,
      name: token.name,
      tokenPrefix: token.tokenPrefix,
      createdAt: token.createdAt,
      lastUsedAt: token.lastUsedAt,
      revokedAt: token.revokedAt,
      group: token.group,
      expenseCount: token._count.expenses,
      friend: null === token.friendId ? null : (friendMap.get(token.friendId) ?? null),
    }));
  }),

  createToken: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1).max(60), target: targetSchema }))
    .mutation(async ({ ctx, input }) => {
      const existingCount = await ctx.db.shortcutToken.count({
        where: { userId: ctx.session.user.id, revokedAt: null },
      });

      if (MAX_TOKENS_PER_USER <= existingCount) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Revoke an existing token before creating a new one',
        });
      }

      if ('group' === input.target.type) {
        const group = await ctx.db.group.findFirst({
          where: {
            id: input.target.groupId,
            archivedAt: null,
            groupUsers: { some: { userId: ctx.session.user.id } },
          },
          select: { id: true },
        });

        if (!group) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
        }
      } else {
        const friend = await ctx.db.user.findFirst({
          where: {
            id: input.target.friendId,
            userBalances: { some: { friendId: ctx.session.user.id } },
          },
          select: { id: true },
        });

        if (!friend) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Friend not found' });
        }
      }

      const { rawToken, tokenHash, tokenPrefix } = generateShortcutToken();

      const token = await ctx.db.shortcutToken.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
          tokenHash,
          tokenPrefix,
          groupId: 'group' === input.target.type ? input.target.groupId : null,
          friendId: 'friend' === input.target.type ? input.target.friendId : null,
        },
        select: { id: true, name: true, tokenPrefix: true, createdAt: true },
      });

      // The only time the raw token ever leaves the server.
      return { ...token, rawToken };
    }),

  revokeToken: protectedProcedure
    .input(z.object({ tokenId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.shortcutToken.updateMany({
        where: { id: input.tokenId, userId: ctx.session.user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (0 === count) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Token not found' });
      }
    }),

  deleteToken: protectedProcedure
    .input(z.object({ tokenId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.shortcutToken.deleteMany({
        where: { id: input.tokenId, userId: ctx.session.user.id },
      });

      if (0 === count) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Token not found' });
      }
    }),

  getRecentExpenses: protectedProcedure.query(async ({ ctx }) => {
    const entries = await ctx.db.shortcutExpense.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: 'desc' },
      take: RECENT_EXPENSES_LIMIT,
      include: {
        token: { select: { id: true, name: true } },
        expense: {
          select: {
            id: true,
            name: true,
            amount: true,
            currency: true,
            category: true,
            expenseDate: true,
            deletedAt: true,
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

    return entries;
  }),

  /** Lets the setup screen show what the server would guess for a merchant name. */
  previewCategory: protectedProcedure
    .input(z.object({ merchant: z.string().trim().min(1).max(200) }))
    .query(({ input }) => suggestCategoryFromMerchant(input.merchant)),
});

export type ShortcutRouter = typeof shortcutRouter;
