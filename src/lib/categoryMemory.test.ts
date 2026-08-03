import { suggestCategory, tokenize, type CategoryHistoryEntry } from './categoryMemory';

const HISTORY: CategoryHistoryEntry[] = [
  { name: 'KFC', category: 'dining_out', count: 12 },
  { name: 'KFC drive', category: 'groceries', count: 1 },
  { name: 'Tournée du bar', category: 'custom:alcool', count: 5 },
  { name: 'Courses Auchan', category: 'groceries', count: 40 },
  { name: 'Essence', category: 'gas', count: 8 },
];

describe('suggestCategory', () => {
  it('ignores case and accents', () => {
    expect(suggestCategory('kfc', HISTORY)).toBe('dining_out');
    expect(suggestCategory('TOURNEE', HISTORY)).toBe('custom:alcool');
  });

  it('prefers the exact libelle over a partial match', () => {
    expect(suggestCategory('KFC', HISTORY)).toBe('dining_out');
  });

  it('matches on a shared word', () => {
    expect(suggestCategory('tournée chez Paul', HISTORY)).toBe('custom:alcool');
  });

  it('matches a word being typed', () => {
    expect(suggestCategory('cour', HISTORY)).toBe('groceries');
  });

  it('returns null when nothing looks alike', () => {
    expect(suggestCategory('cinéma', HISTORY)).toBeNull();
    expect(suggestCategory('', HISTORY)).toBeNull();
  });

  it('drops stopwords so "du" alone never matches', () => {
    expect(tokenize('Tournée du bar')).toEqual(['tournee', 'bar']);
    expect(suggestCategory('du', HISTORY)).toBeNull();
  });
});
