import { SplitType, type User } from '@prisma/client';

import {
  buildShortcutParticipants,
  deriveIdempotencyKey,
  normalizeAmountInput,
} from '~/lib/shortcutExpense';
import { getCurrencyHelpers } from '~/utils/numbers';

const makeUser = (id: number): User =>
  ({
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`,
    emailVerified: null,
    image: null,
    currency: 'EUR',
    defaultCurrency: null,
    preferredLanguage: '',
    bankingId: null,
    obapiProviderId: null,
    hiddenFriendIds: [],
  }) as User;

const EXPENSE_DATE = new Date('2026-09-06T10:30:00.000Z');

describe('buildShortcutParticipants', () => {
  describe('EqualSplit', () => {
    it('should balance the payer against the other participants', () => {
      const [payer, friend] = [makeUser(1), makeUser(2)];

      const { splitType, participants } = buildShortcutParticipants(
        { splitType: SplitType.EQUAL, shares: null, participants: [payer!, friend!] },
        payer!,
        1000n,
        EXPENSE_DATE,
      );

      expect(splitType).toBe(SplitType.EQUAL);
      expect(participants).toHaveLength(2);
      expect(participants.find((p) => 1 === p.userId)?.amount).toBe(500n);
      expect(participants.find((p) => 2 === p.userId)?.amount).toBe(-500n);
    });

    it('should always sum to zero, odd amounts included', () => {
      const users = [makeUser(1), makeUser(2), makeUser(3)];

      const { participants } = buildShortcutParticipants(
        { splitType: SplitType.EQUAL, shares: null, participants: users },
        users[0]!,
        1000n,
        EXPENSE_DATE,
      );

      expect(participants.reduce((sum, p) => sum + p.amount, 0n)).toBe(0n);
    });
  });

  describe('DefaultSplit', () => {
    it('should apply the group default shares', () => {
      const users = [makeUser(1), makeUser(2)];

      const { splitType, participants } = buildShortcutParticipants(
        {
          splitType: SplitType.PERCENTAGE,
          // 10000 = 100%, so the payer only owes a quarter of the expense.
          shares: { 1: 2500n, 2: 7500n },
          participants: users,
        },
        users[0]!,
        1000n,
        EXPENSE_DATE,
      );

      expect(splitType).toBe(SplitType.PERCENTAGE);
      expect(participants.find((p) => 1 === p.userId)?.amount).toBe(750n);
      expect(participants.find((p) => 2 === p.userId)?.amount).toBe(-750n);
    });

    it('should fall back to an equal split when the default no longer adds up', () => {
      const users = [makeUser(1), makeUser(2)];

      const { splitType, participants } = buildShortcutParticipants(
        // A member left and took their 50% with them.
        { splitType: SplitType.PERCENTAGE, shares: { 1: 2500n, 2: 2500n }, participants: users },
        users[0]!,
        1000n,
        EXPENSE_DATE,
      );

      expect(splitType).toBe(SplitType.EQUAL);
      expect(participants.find((p) => 2 === p.userId)?.amount).toBe(-500n);
      expect(participants.reduce((sum, p) => sum + p.amount, 0n)).toBe(0n);
    });
  });
});

describe('deriveIdempotencyKey', () => {
  const base = {
    tokenId: 'tok_1',
    merchant: 'CARREFOUR CITY',
    amount: 1234n,
    currency: 'EUR',
    expenseDate: EXPENSE_DATE,
  };

  it('should be stable for the same transaction', () => {
    expect(deriveIdempotencyKey(base)).toBe(deriveIdempotencyKey({ ...base }));
  });

  it('should ignore seconds, so a re-run within the minute collides on purpose', () => {
    const laterInTheSameMinute = new Date('2026-09-06T10:30:42.000Z');

    expect(deriveIdempotencyKey({ ...base, expenseDate: laterInTheSameMinute })).toBe(
      deriveIdempotencyKey(base),
    );
  });

  it('should ignore merchant casing and extra spaces', () => {
    expect(deriveIdempotencyKey({ ...base, merchant: '  carrefour   city ' })).toBe(
      deriveIdempotencyKey(base),
    );
  });

  it.each([
    ['amount', { amount: 1235n }],
    ['currency', { currency: 'USD' }],
    ['merchant', { merchant: 'MONOPRIX' }],
    ['token', { tokenId: 'tok_2' }],
    ['minute', { expenseDate: new Date('2026-09-06T10:31:00.000Z') }],
  ])('should change when the %s changes', (_label, override) => {
    expect(deriveIdempotencyKey({ ...base, ...override })).not.toBe(deriveIdempotencyKey(base));
  });
});

describe('normalizeAmountInput', () => {
  describe('TwoDecimalCurrency', () => {
    it.each([
      ['12.34', '12.34'],
      ['12,34', '12.34'],
      ['1 234,56', '1234.56'],
      ['1,234.56', '1234.56'],
      ['€12,34', '12.34'],
      ['12', '12'],
      ['12.3', '12.3'],
      // French group separator, not three decimals the currency cannot hold
      ['1.234', '1234'],
      ['1,234', '1234'],
      // Wallet reports some cards' purchases as negative
      ['-12,34', '12.34'],
    ])('should read %s as %s', (input, expected) => {
      expect(normalizeAmountInput(input, 2)).toBe(expected);
    });

    it('should end up as the right number of cents', () => {
      const { toSafeBigInt } = getCurrencyHelpers({ currency: 'EUR' });

      expect(toSafeBigInt(normalizeAmountInput('12,34', 2))).toBe(1234n);
      expect(toSafeBigInt(normalizeAmountInput('1 234,56', 2))).toBe(123456n);
    });
  });

  describe('ThreeDecimalCurrency', () => {
    it('should keep three decimals when the currency has them', () => {
      expect(normalizeAmountInput('1.234', 3)).toBe('1.234');
    });
  });

  describe('NumberInput', () => {
    it('should accept a number and drop its sign', () => {
      expect(normalizeAmountInput(-12.34, 2)).toBe('12.34');
    });
  });
});
