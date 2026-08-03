import { describeExpenseChanges } from './expenseDiff';

describe('describeExpenseChanges', () => {
  it('reads as a before/after per changed field', () => {
    expect(
      describeExpenseChanges([
        { from: 'Courses', to: 'Courses Auchan' },
        { from: '12,50 €', to: '18,00 €' },
      ]),
    ).toBe('Courses → Courses Auchan · 12,50 € → 18,00 €');
  });

  it('labels a change that would be ambiguous on its own', () => {
    expect(describeExpenseChanges([{ label: 'date', from: '14/04', to: '15/04' }])).toBe(
      'date 14/04 → 15/04',
    );
  });

  it('truncates rather than pushing a body the system would cut', () => {
    expect(
      describeExpenseChanges([
        { from: 'a', to: 'b' },
        { from: 'c', to: 'd' },
        { from: 'e', to: 'f' },
        { label: 'date', from: '14/04', to: '15/04' },
      ]),
    ).toBe('a → b · c → d · e → f · …');
  });

  it('says nothing when nothing changed', () => {
    expect(describeExpenseChanges([])).toBe('');
  });
});
