import { useCallback } from 'react';

import { suggestCategory } from '~/lib/categoryMemory';
import { api } from '~/utils/api';

export const useCategoryMemory = () => {
  const { data } = api.categories.history.useQuery(undefined, { staleTime: 10 * 60_000 });

  return useCallback((description: string) => suggestCategory(description, data ?? []), [data]);
};
