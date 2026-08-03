import { type BalanceView, type User } from '@prisma/client';
import React, { useMemo } from 'react';

import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { cn } from '~/lib/utils';
import { BigMath } from '~/utils/numbers';

interface GroupMyBalanceProps {
  userId: number;
  groupBalances?: BalanceView[];
  users?: User[];
  groupId: number;
}

const GroupMyBalance: React.FC<GroupMyBalanceProps> = ({
  userId,
  groupBalances = [],
  users = [],
  groupId,
}) => {
  const { t, getCurrencyHelpersCached } = useTranslationWithUtils();

  const userMap = useMemo(
    () =>
      users.reduce(
        (acc, user) => {
          acc[user.id] = user;
          return acc;
        },
        {} as Record<number, User>,
      ),
    [users],
  );

  const friendBalances = useMemo(
    () =>
      groupBalances.reduce(
        (acc, balance) => {
          if (balance.userId === userId && 0 < BigMath.abs(balance.amount)) {
            acc[balance.friendId] ??= {};
            const friendBalance = acc[balance.friendId]!;
            friendBalance[balance.currency] =
              (friendBalance[balance.currency] ?? 0n) + balance.amount;
          }
          return acc;
        },
        {} as Record<number, Record<string, bigint>>,
      ),
    [groupBalances, userId],
  );

  const cumulatedBalances = useMemo(
    () =>
      Object.entries(
        Object.values(friendBalances).reduce(
          (acc, balances) => {
            if (balances) {
              Object.entries(balances).forEach(([currency, amount]) => {
                acc[currency] = (acc[currency] ?? 0n) + amount;
              });
            }
            return acc;
          },
          {} as Record<string, bigint>,
        ),
      ).map(([currency, amount]) => ({ currency, amount })),
    [friendBalances],
  );

  const hasSeveralFriends = 1 < Object.keys(friendBalances).length;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground text-sm">{t('ui.total_balance')}</p>
      <div className="flex flex-wrap items-baseline gap-2">
        {cumulatedBalances.length ? (
          cumulatedBalances.map(({ currency, amount }) => (
            <span
              key={currency}
              className={cn(
                'text-3xl font-bold',
                0n < amount ? 'text-positive' : 'text-negative',
              )}
            >
              {0n < amount ? '+' : '\u2212'}
              {getCurrencyHelpersCached(currency).toUIString(BigMath.abs(amount))}
            </span>
          ))
        ) : (
          <span className="text-3xl font-bold">{t('ui.settled_up')}</span>
        )}
      </div>

      {/* A deux, préciser "tu dois à X" est redondant : il n'y a qu'un X. */}
      {hasSeveralFriends &&
        Object.entries(friendBalances)
          .slice(0, 2)
          .map(([friendId, balances]) => {
            const friend = userMap[+friendId];
            return (
              <div key={friendId} className="text-sm text-gray-500">
                {Object.entries(balances).map(([currency, amount]) => (
                  <div key={currency}>
                    {0 < amount
                      ? `${friend?.name} ${t('ui.expense.user.owe')} ${t('actors.you_dativus').toLowerCase()}`
                      : `${t('actors.you')} ${t('ui.expense.you.owe')} ${friend?.name}`}{' '}
                    {getCurrencyHelpersCached(currency).toUIString(amount)}
                  </div>
                ))}
              </div>
            );
          })}
    </div>
  );
};

export default GroupMyBalance;
