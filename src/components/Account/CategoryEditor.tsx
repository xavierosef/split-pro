import { Check, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { CategoryTile } from '~/components/Expense/CategoryTile';
import { SimpleConfirmationDialog } from '~/components/SimpleConfirmationDialog';
import { Button } from '~/components/ui/button';
import { AppDrawer } from '~/components/ui/drawer';
import { Input } from '~/components/ui/input';
import { CUSTOM_COLORS, CUSTOM_ICONS } from '~/lib/customCategoryIcons';
import { type CustomCategory } from '~/lib/customCategories';
import { cn } from '~/lib/utils';
import { api } from '~/utils/api';

const ICON_NAMES = Object.keys(CUSTOM_ICONS);

const CategoryForm: React.FC<{
  initial?: CustomCategory;
  onDone: () => void;
}> = ({ initial, onDone }) => {
  const { t } = useTranslation();
  const utils = api.useUtils();
  const upsert = api.categories.upsert.useMutation();

  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? ICON_NAMES[0]!);
  const [color, setColor] = useState(initial?.color ?? CUSTOM_COLORS[0]!);

  const save = useCallback(async () => {
    if (!name.trim()) {
      return;
    }
    try {
      await upsert.mutateAsync({ id: initial?.id, name: name.trim(), icon, color });
      await utils.categories.list.invalidate();
      onDone();
    } catch (e) {
      toast.error(t('errors.something_went_wrong'));
      console.error(e);
    }
  }, [name, icon, color, initial?.id, upsert, utils, onDone, t]);

  const Preview = CUSTOM_ICONS[icon]!;

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center gap-3">
        <span
          className="category-tile flex size-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ '--category-color': color } as React.CSSProperties}
        >
          <Preview size={24} style={{ color }} />
        </span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('account.categories.name_placeholder')}
          className="text-base"
          autoFocus
        />
      </div>

      <div>
        <p className="text-muted-foreground mb-2 text-sm">{t('account.categories.colour')}</p>
        <div className="flex flex-wrap gap-3">
          {CUSTOM_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              className="flex size-9 items-center justify-center rounded-full"
              style={{ backgroundColor: c }}
            >
              {c === color && <Check className="size-4 text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-muted-foreground mb-2 text-sm">{t('account.categories.icon')}</p>
        <div className="grid max-h-52 grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-2 overflow-y-auto">
          {ICON_NAMES.map((n) => {
            const Icon = CUSTOM_ICONS[n]!;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setIcon(n)}
                aria-label={n}
                className={cn(
                  'flex size-12 items-center justify-center rounded-xl border',
                  n === icon ? 'border-primary' : 'border-transparent',
                )}
              >
                <Icon size={20} style={{ color: n === icon ? color : undefined }} />
              </button>
            );
          })}
        </div>
      </div>

      <Button
        className="liquid-glass liquid-glass--accent h-13 w-full rounded-full text-base font-semibold text-white"
        disabled={!name.trim() || upsert.isPending}
        loading={upsert.isPending}
        onClick={save}
      >
        {t('actions.save')}
      </Button>
    </div>
  );
};

const CategoryLine: React.FC<{ category: CustomCategory }> = ({ category }) => {
  const { t } = useTranslation();
  const utils = api.useUtils();
  const remove = api.categories.delete.useMutation();
  const usage = api.categories.usage.useQuery({ id: category.id });
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-center gap-3 py-1.5">
      <AppDrawer
        title={t('account.categories.edit')}
        className="h-[80vh]"
        open={editing}
        onOpenChange={setEditing}
        trigger={
          <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <CategoryTile category={category.id} className="size-9 shrink-0 rounded-xl" />
            <span className="truncate">{category.name}</span>
          </button>
        }
      >
        <CategoryForm initial={category} onDone={() => setEditing(false)} />
      </AppDrawer>

      <SimpleConfirmationDialog
        title={t('account.categories.delete_title')}
        description={
          usage.data
            ? t('account.categories.delete_used', { count: usage.data })
            : t('account.categories.delete_unused')
        }
        hasPermission
        loading={remove.isPending}
        variant="destructive"
        onConfirm={async () => {
          await remove.mutateAsync({ id: category.id });
          await utils.categories.list.invalidate();
        }}
      >
        <Button variant="ghost" className="px-2 text-red-500">
          <Trash2 className="size-5" />
        </Button>
      </SimpleConfirmationDialog>
    </div>
  );
};

export const CategoryEditor: React.FC = () => {
  const { t } = useTranslation();
  const categories = api.categories.list.useQuery();
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-2 pb-6">
      {categories.data?.length ? (
        categories.data.map((c) => <CategoryLine key={c.id} category={c} />)
      ) : (
        <p className="text-muted-foreground py-4 text-center text-sm">
          {t('account.categories.empty')}
        </p>
      )}

      <AppDrawer
        title={t('account.categories.create')}
        className="h-[80vh]"
        open={creating}
        onOpenChange={setCreating}
        trigger={
          <Button
            variant="secondary"
            className="mt-2 h-12 w-full justify-center gap-2 rounded-full"
          >
            <Plus className="size-5" />
            {t('account.categories.create')}
          </Button>
        }
      >
        <CategoryForm onDone={() => setCreating(false)} />
      </AppDrawer>
    </div>
  );
};
