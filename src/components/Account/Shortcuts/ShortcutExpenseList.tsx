import Link from 'next/link';
import React from 'react';

import { CategoryIcon } from '~/components/ui/categoryIcons';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { type RouterOutputs, api } from '~/utils/api';

type ShortcutExpenseItem = RouterOutputs['shortcut']['getRecentExpenses'][number];

const ExpenseRow: React.FC<{ entry: ShortcutExpenseItem }> = ({ entry }) => {
  const { t, toUIDate, getCurrencyHelpersCached } = useTranslationWithUtils();
  const { toUIString } = getCurrencyHelpersCached(entry.expense.currency);

  return (
    <Link
      href={`/expenses/${entry.expense.id}`}
      className="flex items-center justify-between gap-3 border-b py-3 last:border-b-0"
    >
      <div className="flex min-w-0 items-center gap-3">
        <CategoryIcon category={entry.expense.category} size={18} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">
            {entry.expense.name}
            {entry.expense.deletedAt ? ` · ${t('shortcuts.expense_deleted')}` : ''}
          </span>
          <span className="truncate text-xs text-gray-500">
            {toUIDate(entry.expense.expenseDate, { useToday: true })}
            {' · '}
            {entry.token.name}
            {entry.expense.group ? ` · ${entry.expense.group.name}` : ''}
          </span>
          {entry.categoryOverridden && (
            <span className="truncate text-xs text-gray-500">
              {t('shortcuts.category_overridden', { suggested: entry.suggestedCategory })}
            </span>
          )}
        </div>
      </div>
      <span className="shrink-0 text-sm">{toUIString(entry.expense.amount)}</span>
    </Link>
  );
};

export const ShortcutExpenseList: React.FC = () => {
  const { t } = useTranslationWithUtils();
  const expensesQuery = api.shortcut.getRecentExpenses.useQuery();

  if (!expensesQuery.data?.length) {
    return <p className="text-sm text-gray-400">{t('shortcuts.no_expenses')}</p>;
  }

  return (
    <div className="flex flex-col">
      {expensesQuery.data.map((entry) => (
        <ExpenseRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
};
