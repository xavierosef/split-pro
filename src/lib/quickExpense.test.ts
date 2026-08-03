import {
  equalSplitNets,
  formatCents,
  parseQuickExpense,
  summarizeQuickExpense,
} from './quickExpense';

describe('parseQuickExpense', () => {
  it('reads the amount in front of the description', () => {
    expect(parseQuickExpense('12,50 courses')).toEqual({ cents: 1250n, name: 'Courses' });
    expect(parseQuickExpense('12.5 courses')).toEqual({ cents: 1250n, name: 'Courses' });
    expect(parseQuickExpense('12 courses')).toEqual({ cents: 1200n, name: 'Courses' });
    expect(parseQuickExpense('12,50 € courses')).toEqual({ cents: 1250n, name: 'Courses' });
  });

  it('reads the spoken form Siri produces', () => {
    expect(parseQuickExpense('12 euros 50 courses')).toEqual({ cents: 1250n, name: 'Courses' });
    expect(parseQuickExpense('12 euros courses')).toEqual({ cents: 1200n, name: 'Courses' });
    expect(parseQuickExpense('courses 12 euros 50')).toEqual({ cents: 1250n, name: 'Courses' });
    expect(parseQuickExpense('3 € 20 café')).toEqual({ cents: 320n, name: 'Café' });
  });

  it('reads the amount behind the description', () => {
    expect(parseQuickExpense('courses auchan 12,50')).toEqual({
      cents: 1250n,
      name: 'Courses auchan',
    });
  });

  it('prefers the leading amount over a number inside the description', () => {
    expect(parseQuickExpense('12,50 pour 2 personnes')).toEqual({
      cents: 1250n,
      name: 'Pour 2 personnes',
    });
  });

  it('takes the last number when the description counts things', () => {
    expect(parseQuickExpense('auchan 2 packs 12,50')).toEqual({
      cents: 1250n,
      name: 'Auchan 2 packs',
    });
  });

  it('refuses an input without an amount or without a description', () => {
    expect(parseQuickExpense('courses')).toBeNull();
    expect(parseQuickExpense('12,50')).toBeNull();
    expect(parseQuickExpense('')).toBeNull();
  });
});

describe('equalSplitNets', () => {
  it('splits an even amount down the middle', () => {
    expect(equalSplitNets(1250n)).toEqual({ payer: 625n, other: -625n });
  });

  it('leaves the nets summing to zero on an odd cent', () => {
    const { payer, other } = equalSplitNets(1251n);
    expect(payer + other).toBe(0n);
    expect(other).toBe(-625n);
  });
});

describe('summarizeQuickExpense', () => {
  it('states what the other one owes', () => {
    expect(summarizeQuickExpense(1250n, 'Courses', 'Sarah')).toBe(
      `${formatCents(1250n)} · Courses · Sarah te doit ${formatCents(625n)}`,
    );
  });
});
