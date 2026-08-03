import { CATEGORIES } from './category';

// Une teinte par famille de categorie : on reconnait le type de depense a la
// couleur avant meme de lire le libelle. Les sous-categories heritent de leur
// famille pour que la liste reste lisible plutot que bariolee.
export const SECTION_COLORS: Record<keyof typeof CATEGORIES, string> = {
  entertainment: 'oklch(0.68 0.19 320)',
  food: 'oklch(0.72 0.17 55)',
  home: 'oklch(0.68 0.15 155)',
  life: 'oklch(0.7 0.17 15)',
  travel: 'oklch(0.72 0.15 240)',
  utilities: 'oklch(0.75 0.15 195)',
  general: 'oklch(0.65 0.03 260)',
};

const ITEM_TO_SECTION = Object.entries(CATEGORIES).reduce<Record<string, string>>(
  (acc, [section, items]) => {
    acc[section] = section;
    items.forEach((item) => {
      if ('other' !== item) {
        acc[item] = section;
      }
    });
    return acc;
  },
  {},
);

export const categorySection = (category?: string | null): keyof typeof CATEGORIES | null =>
  (ITEM_TO_SECTION[category ?? ''] as keyof typeof CATEGORIES | undefined) ?? null;

export const categoryColor = (category?: string | null): string => {
  const section = categorySection(category) ?? 'general';
  return SECTION_COLORS[section] ?? SECTION_COLORS.general;
};
