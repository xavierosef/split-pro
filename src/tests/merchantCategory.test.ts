import { CATEGORY_ITEMS, DEFAULT_CATEGORY, isCategoryItem } from '~/lib/category';
import {
  cleanMerchantName,
  normalizeMerchant,
  suggestCategoryFromMerchant,
} from '~/lib/merchantCategory';

describe('normalizeMerchant', () => {
  it('should uppercase, drop accents and collapse punctuation', () => {
    expect(normalizeMerchant('Café  de-la Gare, Paris')).toBe('CAFE DE LA GARE PARIS');
  });

  it('should return an empty string for a name with no letters or digits', () => {
    expect(normalizeMerchant('***')).toBe('');
  });
});

describe('suggestCategoryFromMerchant', () => {
  describe('WalletMerchantNames', () => {
    const cases: [string, string][] = [
      ['CARREFOUR CITY', 'groceries'],
      ['CB MONOPRIX 4531 PARIS 05/09', 'groceries'],
      ['LIDL FRANCE', 'groceries'],
      ['SNCF CONNECT', 'train'],
      ['UBER   *TRIP', 'taxi'],
      ['UBER EATS', 'diningOut'],
      ['TotalEnergies Station', 'fuel'],
      ['PHARMACIE DU CENTRE', 'medical'],
      ['SUMUP BOULANGERIE MARTIN', 'diningOut'],
      ['Netflix.com', 'movies'],
      ['SPOTIFY AB', 'music'],
      ['LEROY MERLIN', 'maintenance'],
      ['DECATHLON 0123', 'sports'],
      ['AIR FRANCE', 'plane'],
      ['BOOKING.COM', 'hotel'],
      ['EDF CLIENTS PART', 'electricity'],
      ['FREE MOBILE', 'phone'],
    ];

    it.each(cases)('should map %s to %s', (merchant, expected) => {
      expect(suggestCategoryFromMerchant(merchant).category).toBe(expected);
    });
  });

  describe('UnknownMerchants', () => {
    it('should fall back to the default category rather than guess', () => {
      const suggestion = suggestCategoryFromMerchant('ETS DUPONT ET FILS');

      expect(suggestion.category).toBe(DEFAULT_CATEGORY);
      expect(suggestion.matchedKeyword).toBeNull();
    });

    it('should handle an empty merchant name', () => {
      expect(suggestCategoryFromMerchant('   ').category).toBe(DEFAULT_CATEGORY);
    });
  });

  describe('MatchingRules', () => {
    it('should only match whole words', () => {
      // `BAR` must not match inside `BARBIER`.
      expect(suggestCategoryFromMerchant('BARBIER DU COIN').category).toBe(DEFAULT_CATEGORY);
    });

    it('should prefer the more specific rule when two could match', () => {
      expect(suggestCategoryFromMerchant('UBER EATS PARIS').category).toBe('diningOut');
    });

    it('should always return a category the app knows', () => {
      const merchants = ['CARREFOUR', 'SNCF', 'IKEA', 'MYSTERY SHOP'];

      merchants.forEach((merchant) => {
        expect(isCategoryItem(suggestCategoryFromMerchant(merchant).category)).toBe(true);
      });
    });
  });
});

describe('cleanMerchantName', () => {
  it('should strip the terminal prefix, the store number and the date tail', () => {
    expect(cleanMerchantName('CB CARREFOUR CITY 4521 PARIS 05 09')).toBe('Carrefour City Paris');
  });

  it('should keep short words uppercase', () => {
    expect(cleanMerchantName('SNCF CONNECT')).toBe('SNCF Connect');
  });

  it('should fall back to the raw name when cleaning leaves nothing', () => {
    expect(cleanMerchantName('***')).toBe('***');
  });
});

describe('CATEGORY_ITEMS', () => {
  it('should contain the section names and no `other` placeholder', () => {
    expect(CATEGORY_ITEMS).toContain('food');
    expect(CATEGORY_ITEMS).toContain('groceries');
    expect(CATEGORY_ITEMS).not.toContain('other');
  });
});
