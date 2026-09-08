export const CATEGORIES = {
  entertainment: ['games', 'movies', 'music', 'sports', 'other'],
  food: ['diningOut', 'groceries', 'liquor', 'other'],
  home: [
    'electronics',
    'furniture',
    'supplies',
    'maintenance',
    'mortgage',
    'pets',
    'rent',
    'services',
    'other',
  ],
  life: ['childcare', 'clothing', 'education', 'gifts', 'insurance', 'medical', 'taxes', 'other'],
  travel: ['bicycle', 'bus', 'train', 'car', 'fuel', 'hotel', 'parking', 'plane', 'taxi', 'other'],
  utilities: ['cleaning', 'electricity', 'gas', 'internet', 'trash', 'phone', 'water', 'other'],
  general: ['other'],
} as const satisfies Record<string, string[]>;

export const DEFAULT_CATEGORY = 'general';

export type CategorySection = keyof typeof CATEGORIES;

type CategoryValues = (typeof CATEGORIES)[CategorySection][number];
type CategoryWithoutOther = Exclude<CategoryValues, 'other'>;

export type CategoryItem = CategoryWithoutOther | CategorySection;

/**
 * Every value an `Expense.category` may hold: the section names (used for the `other`
 * item of each section, see `CategoryPicker`) plus the named items of every section.
 */
export const CATEGORY_ITEMS: CategoryItem[] = [
  ...(Object.keys(CATEGORIES) as CategorySection[]),
  ...Object.values(CATEGORIES)
    .flat()
    .filter((item): item is CategoryWithoutOther => 'other' !== item),
];

export const isCategoryItem = (category: string): category is CategoryItem =>
  CATEGORY_ITEMS.includes(category as CategoryItem);
