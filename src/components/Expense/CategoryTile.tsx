import React from 'react';
import { CategoryIcon } from '~/components/ui/categoryIcons';
import { useCategoryResolver } from '~/hooks/useCategoryResolver';
import { cn } from '~/lib/utils';

export const CategoryTile: React.FC<{
  category?: string | null;
  className?: string;
  iconClassName?: string;
  iconSize?: number;
}> = ({ category, className, iconClassName, iconSize = 16 }) => {
  const { color, icon } = useCategoryResolver();
  const tint = color(category);
  const CustomIcon = icon(category);

  return (
    <span
      className={cn('category-tile flex shrink-0 items-center justify-center', className)}
      style={{ '--category-color': tint } as React.CSSProperties}
    >
      {CustomIcon ? (
        <CustomIcon size={iconSize} className={iconClassName} style={{ color: tint }} />
      ) : (
        <CategoryIcon
          category={category ?? undefined}
          size={iconSize}
          className={iconClassName}
          style={{ color: tint }}
        />
      )}
    </span>
  );
};
