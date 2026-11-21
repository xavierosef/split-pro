/*
 * Regression tests for the two write flaws of v2.1.5 (upstream #799), on the paths the fork adds
 * or that upstream leaves uncovered:
 * - flaw 1: any signed-in account could write an expense between other people. Upstream checks
 *   group membership on the router; the fork also requires the actor to be involved in an
 *   ungrouped expense, and runs both checks inside createExpense, which the token-authenticated
 *   routes (/api/quick-expense, /api/shortcuts/expense) call directly;
 * - flaw 2: any signed-in account could edit or delete any expense.
 */
import type { env } from '~/env';
import { deleteAccount } from '~/server/api/services/deleteAccount';
import {
  ShortcutError,
  addExpenseFromShortcut,
  authenticateShortcutToken,
  generateShortcutToken,
} from '~/server/api/services/shortcutService';
import { createExpense } from '~/server/api/services/splitService';

import { db } from './database';
import { accountingSnapshot, expenseInput, testScenario } from './factories';
import { callerFor } from './trpc';

jest.mock('~/env', () => ({
  env: {
    ...jest.requireActual<{ env: typeof env }>('~/env').env,
    NEXTAUTH_URL: 'https://splitpro.example.test',
  },
}));

const createShortcutToken = async (userId: number, groupId: number) => {
  const { rawToken, tokenHash, tokenPrefix } = generateShortcutToken();
  const token = await db.shortcutToken.create({
    data: { userId, name: 'iPhone', tokenHash, tokenPrefix, groupId },
  });
  return { rawToken, token };
};

describe('fork write authorization', () => {
  describe('flaw 1: writing an expense between other people', () => {
    it('rejects an ungrouped expense the actor neither pays nor shares', async () => {
      const { owner, member, outsider } = await testScenario();
      const before = await accountingSnapshot();
      const caller = callerFor(outsider.id);

      await expect(
        caller.expense.addOrEditExpense(expenseInput(owner.id, member.id)),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(
        caller.expense.addOrEditExpense(
          expenseInput(owner.id, member.id, {
            participants: [
              { userId: owner.id, amount: 1000n },
              { userId: member.id, amount: -1000n },
              { userId: outsider.id, amount: 0n },
            ],
          }),
        ),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(
        caller.expense.addOrEditCurrencyConversion({
          amount: 1000n,
          rate: 2,
          from: 'USD',
          to: 'EUR',
          senderId: owner.id,
          receiverId: member.id,
          groupId: null,
        }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      expect(await accountingSnapshot()).toEqual(before);
    });

    it('still accepts an ungrouped expense with a new contact', async () => {
      const { owner, outsider } = await testScenario();

      const [expense] = await callerFor(owner.id).expense.addOrEditExpense(
        expenseInput(outsider.id, owner.id),
      );

      expect(expense).toMatchObject({ paidBy: outsider.id, addedBy: owner.id });
    });

    it('rejects an edit that moves an ungrouped expense onto other people', async () => {
      const { owner, member, outsider } = await testScenario();
      const caller = callerFor(owner.id);
      const [expense] = await caller.expense.addOrEditExpense(expenseInput(owner.id, member.id));
      const before = await accountingSnapshot();

      await expect(
        caller.expense.addOrEditExpense({
          ...expenseInput(member.id, outsider.id),
          expenseId: expense!.id,
        }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      expect(await accountingSnapshot()).toEqual(before);
    });

    it('checks the parties when createExpense is called without the router', async () => {
      const { owner, member, outsider, group } = await testScenario();
      const before = await accountingSnapshot();

      // A group member cannot charge someone outside the group.
      await expect(
        createExpense(expenseInput(owner.id, outsider.id, { groupId: group.id }), owner.id),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      // An outsider cannot charge the group's members, with or without themselves in it.
      await expect(
        createExpense(expenseInput(owner.id, member.id, { groupId: group.id }), outsider.id),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(
        createExpense(expenseInput(outsider.id, member.id, { groupId: group.id }), outsider.id),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      // Nor record a debt between two other people outside a group.
      await expect(
        createExpense(expenseInput(owner.id, member.id), outsider.id),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      expect(await accountingSnapshot()).toEqual(before);
    });
  });

  describe('flaw 2: editing or deleting someone else’s expense', () => {
    it.each(['grouped', 'ungrouped'] as const)(
      'rejects an outsider on a %s expense without changing accounting',
      async (kind) => {
        const { owner, member, outsider, group } = await testScenario();
        const input = expenseInput(owner.id, member.id, {
          groupId: 'grouped' === kind ? group.id : null,
        });
        const [expense] = await callerFor(owner.id).expense.addOrEditExpense(input);
        const before = await accountingSnapshot();
        const caller = callerFor(outsider.id);

        await expect(
          caller.expense.addOrEditExpense({ ...input, expenseId: expense!.id, name: 'Stolen' }),
        ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
        await expect(
          caller.expense.deleteExpense({ expenseId: expense!.id }),
        ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

        expect(await accountingSnapshot()).toEqual(before);
      },
    );
  });

  describe('iOS shortcut tokens', () => {
    it('adds an expense split with the live members of the token group', async () => {
      const { owner, member, group } = await testScenario();
      const { rawToken } = await createShortcutToken(owner.id, group.id);

      const response = await addExpenseFromShortcut(await authenticateShortcutToken(rawToken), {
        amount: '12.50',
        merchant: 'Bakery',
        currency: 'USD',
        dryRun: false,
        force: false,
      });

      const expense = await db.expense.findUniqueOrThrow({
        where: { id: response.expenseId! },
        include: { expenseParticipants: true },
      });
      expect(expense).toMatchObject({ groupId: group.id, paidBy: owner.id, addedBy: owner.id });
      const participantIds = expense.expenseParticipants.map((p) => p.userId);
      expect(participantIds).toHaveLength(2);
      expect(participantIds).toEqual(expect.arrayContaining([owner.id, member.id]));
    });

    it('stops working once the owner deletes their account', async () => {
      const { owner, group } = await testScenario();
      const { rawToken, token } = await createShortcutToken(owner.id, group.id);
      await expect(authenticateShortcutToken(rawToken)).resolves.toMatchObject({ id: token.id });

      await deleteAccount(db, owner.id);

      expect(await db.shortcutToken.findUniqueOrThrow({ where: { id: token.id } })).toMatchObject({
        revokedAt: expect.any(Date),
      });
      await expect(authenticateShortcutToken(rawToken)).rejects.toBeInstanceOf(ShortcutError);
    });

    it('rejects a token whose owner is deleted even if it was never revoked', async () => {
      const { owner, group } = await testScenario();
      const { rawToken } = await createShortcutToken(owner.id, group.id);
      await db.user.update({ where: { id: owner.id }, data: { deletedAt: new Date() } });

      await expect(authenticateShortcutToken(rawToken)).rejects.toMatchObject({ status: 401 });
    });
  });
});
