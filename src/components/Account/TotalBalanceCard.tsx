import { useMemo } from 'react';
import { ConvertibleBalance } from '~/components/Expense/ConvertibleBalance';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { api } from '~/utils/api';

export const TotalBalanceCard: React.FC = () => {
  const { t } = useTranslationWithUtils();
  const balanceQuery = api.expense.getBalances.useQuery();
  const cumulatedQuery = api.expense.getCumulatedBalances.useQuery();

  const currencies = useMemo(() => {
    const nonZero = balanceQuery.data?.balances.flatMap((b) =>
      b.currencies.filter((c) => 0n !== c.amount),
    );
    return nonZero ? [...new Set(nonZero.map((c) => c.currency))] : [];
  }, [balanceQuery.data?.balances]);

  const balances = useMemo(
    () => [cumulatedQuery.data?.youOwe ?? [], cumulatedQuery.data?.youGet ?? []].flat(),
    [cumulatedQuery.data],
  );

  if (!balances.length) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl border px-4 py-3">
      <p className="text-center text-sm">{t('ui.total_balance')}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-1">
        <ConvertibleBalance
          balances={balances}
          showMultiOption
          className="flex-wrap"
          overrideCurrencies={currencies}
          forceShowButton={1 < currencies.length}
        />
      </div>
    </div>
  );
};
