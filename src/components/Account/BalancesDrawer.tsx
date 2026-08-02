import { Scale } from 'lucide-react';
import { BalanceEntry } from '~/components/Expense/BalanceEntry';
import { AccountButton } from '~/components/Account/AccountButton';
import { AppDrawer } from '~/components/ui/drawer';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { api } from '~/utils/api';

export const BalancesDrawer: React.FC = () => {
  const { t } = useTranslationWithUtils();
  const balanceQuery = api.expense.getBalances.useQuery();
  const balances = balanceQuery.data?.balances ?? [];

  return (
    <AppDrawer
      title={t('ui.outstanding_balances')}
      className="h-[70vh]"
      trigger={
        <AccountButton>
          <Scale className="size-5 text-cyan-500" />
          {t('navigation.balances')}
        </AccountButton>
      }
    >
      <div className="flex flex-col gap-8 pt-2">
        {balances.length ? (
          balances.map((balance) => (
            <BalanceEntry
              key={balance.friend.id}
              id={balance.friend.id}
              entity={balance.friend}
              balances={balance.currencies}
            />
          ))
        ) : (
          <p className="text-muted-foreground text-center">{t('ui.settled_up')}</p>
        )}
      </div>
    </AppDrawer>
  );
};
