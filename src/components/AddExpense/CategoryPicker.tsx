import { CATEGORIES, type CategoryItem } from '~/lib/category';
import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';

import { Button } from '../ui/button';
import { CategoryTile } from '~/components/Expense/CategoryTile';
import { useCategoryResolver } from '~/hooks/useCategoryResolver';
import { AppDrawer, AppDrawerClose, DrawerClose } from '../ui/drawer';

export const CategoryPicker: React.FC<{
  category: string;
  onCategoryPick: (category: string) => void;
}> = ({ category, onCategoryPick }) => {
  const { t } = useTranslation('categories');

  const { custom } = useCategoryResolver();

  const trigger = useMemo(
    () => (
      <div className="flex w-[73px] cursor-pointer justify-center rounded-lg border py-2">
        <CategoryTile category={category} className="size-8 rounded-lg" iconSize={18} />
      </div>
    ),
    [category],
  );

  return (
    <AppDrawer trigger={trigger} title={t('title')} className="h-[70vh]" shouldCloseOnAction>
      {0 < custom.length && (
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold">{t('custom_section', 'Mes catégories')}</h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(75px,1fr))] gap-4">
            {custom.map((c) => (
              <AppDrawerClose key={c.id} asChild>
                <Button
                  variant="ghost"
                  className="flex h-auto min-h-[75px] w-[75px] flex-col items-center justify-start gap-1 justify-self-center py-3 text-center"
                  onClick={() => onCategoryPick(c.id)}
                >
                  <CategoryTile category={c.id} className="size-8 rounded-lg" iconSize={18} />
                  <span className="block text-xs leading-tight text-wrap">{c.name}</span>
                </Button>
              </AppDrawerClose>
            ))}
          </div>
        </div>
      )}
      {Object.entries(CATEGORIES).map(([categoryName, categoryItems]) => (
        <div key={categoryName} className="mb-8">
          <h3 className="mb-4 text-lg font-semibold">
            {t(`categories_list.${categoryName}.name`)}
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(75px,1fr))] gap-4">
            {categoryItems.map((key: string) => {
              const handleClick = useMemo(
                () => () => {
                  onCategoryPick('other' === key ? categoryName : key);
                },
                [key],
              );

              return (
                <AppDrawerClose key={key} asChild>
                  <Button
                    variant="ghost"
                    className="flex h-auto min-h-[75px] w-[75px] flex-col items-center justify-start gap-1 justify-self-center py-3 text-center"
                    onClick={handleClick}
                  >
                    <CategoryTile
                      category={'other' === key ? categoryName : key}
                      className="size-8 rounded-lg"
                      iconSize={18}
                    />
                    <span className="block text-xs leading-tight text-wrap">
                      {t(`categories_list.${categoryName}.items.${key}`, { ns: 'categories' })}
                    </span>
                  </Button>
                </AppDrawerClose>
              );
            })}
          </div>
        </div>
      ))}
    </AppDrawer>
  );
};
