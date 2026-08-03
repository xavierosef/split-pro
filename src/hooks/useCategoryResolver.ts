import { useCallback, useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { type LucideIcon } from 'lucide-react';

import { categoryColor, categorySection } from '~/lib/categoryColors';
import { customIcon } from '~/lib/customCategoryIcons';
import { isCustomCategory } from '~/lib/customCategories';
import { api } from '~/utils/api';

// Un seul endroit sait resoudre une categorie — par defaut ou personnalisee —
// en couleur, icone et libelle. Les ecrans n'ont pas a connaitre la difference.
export const useCategoryResolver = () => {
  const { t } = useTranslation('categories');
  const customQuery = api.categories.list.useQuery(undefined, { staleTime: 5 * 60_000 });

  const byId = useMemo(
    () => new Map((customQuery.data ?? []).map((c) => [c.id, c])),
    [customQuery.data],
  );

  const color = useCallback(
    (category?: string | null) =>
      (isCustomCategory(category) ? byId.get(category!)?.color : undefined) ??
      categoryColor(category),
    [byId],
  );

  const icon = useCallback(
    (category?: string | null): LucideIcon | undefined =>
      isCustomCategory(category) ? customIcon(byId.get(category!)?.icon) : undefined,
    [byId],
  );

  // Les libelles d'origine vivent sous categories_list.<famille>.items.<cle> ;
  // une categorie « other » est stockee sous le nom de sa famille.
  const name = useCallback(
    (category?: string | null) => {
      const custom = byId.get(category ?? '');
      if (custom) {
        return custom.name;
      }

      const section = categorySection(category);
      if (!section) {
        return '';
      }

      const familyName = t(`categories_list.${section}.name`);
      return category === section
        ? familyName
        : t(`categories_list.${section}.items.${category}`, familyName);
    },
    [byId, t],
  );

  return { color, icon, name, custom: customQuery.data ?? [] };
};
