import { Scale } from 'lucide-react';
import { AccountButton } from '~/components/Account/AccountButton';
import { BalanceList } from '~/components/Expense/BalanceList';
import { AppDrawer } from '~/components/ui/drawer';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { SOLO_GROUP_ID } from '~/lib/soloGroup';
import { api } from '~/utils/api';

export const GroupBalancesDrawer: React.FC = () => {
  const { t } = useTranslationWithUtils();
  const groupQuery = api.group.getGroupDetails.useQuery({ groupId: SOLO_GROUP_ID });

  return (
    <AppDrawer
      title={t('group_details.tabs.balances')}
      className="h-[70vh]"
      trigger={
        <AccountButton>
          <Scale className="size-5 text-cyan-500" />
          {t('group_details.tabs.balances')}
        </AccountButton>
      }
    >
      <BalanceList
        groupBalances={groupQuery.data?.groupBalances}
        users={groupQuery.data?.groupUsers.map((gu) => gu.user)}
      />
    </AppDrawer>
  );
};
