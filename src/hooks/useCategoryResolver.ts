import { useCallback, useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { type LucideIcon } from 'lucide-react';

import { categoryColor } from '~/lib/categoryColors';
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

  const name = useCallback(
    (category?: string | null) => byId.get(category ?? '')?.name ?? t(`flat.${category}`, ''),
    [byId, t],
  );

  return { color, icon, name, custom: customQuery.data ?? [] };
};
