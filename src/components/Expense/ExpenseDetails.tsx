import { SplitType } from '@prisma/client';
import { isSameDay } from 'date-fns';
import { type User as NextUser } from 'next-auth';

import type { inferRouterOutputs } from '@trpc/server';
import { ArrowRightIcon, Landmark, Merge, PencilIcon, Repeat, Users } from 'lucide-react';
import Link from 'next/link';
import React, { type ComponentProps, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useCategoryResolver } from '~/hooks/useCategoryResolver';
import { useIntlCronParser } from '~/hooks/useIntlCronParser';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { cronFromBackend } from '~/lib/cron';
import { DEFAULT_CATEGORY } from '~/lib/category';
import { isCurrencyCode } from '~/lib/currency';
import type { ExpenseRouter } from '~/server/api/routers/expense';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';
import { BigMath } from '~/utils/numbers';

import { CurrencyConversion } from '../Friend/CurrencyConversion';
import { EntityAvatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { CategoryTile } from './CategoryTile';
import { CurrencyInput } from '../ui/currency-input';
import { AppDrawer } from '../ui/drawer';
import { Receipt } from './Receipt';
import { DateSelector } from '../AddExpense/DateSelector';

type ExpenseDetailsOutput = NonNullable<inferRouterOutputs<ExpenseRouter>['getExpenseDetails']>;

interface ExpenseDetailsProps {
  user: NextUser;
  expense: ExpenseDetailsOutput;
}

const ExpenseDetails: React.FC<ExpenseDetailsProps> = ({ user, expense }) => {
  const { displayName, toUIDate, t, getCurrencyHelpersCached } = useTranslationWithUtils();

  const { color: categoryColor, name: categoryName } = useCategoryResolver();
  const categoryLabel = categoryName(expense.category);
  const tint = categoryColor(expense.category);

  const { cronParser, i18nReady } = useIntlCronParser();

  const cronString = useMemo(() => {
    if (!expense.recurrence) {
      return null;
    }
    try {
      return cronParser(cronFromBackend(expense.recurrence.job.schedule));
    } catch {
      toast.error(t('errors.invalid_cron_expression'));
      console.error(
        `Failed to parse cron expression for expense: ${expense.recurrence.job.schedule}`,
      );
      return null;
    }
  }, [t, expense.recurrence, cronParser]);

  const { toUIString } = getCurrencyHelpersCached(expense.currency);

  return (
    <>
      {/* Le montant est l'information qu'on vient chercher : il tient la carte,
          le reste s'ordonne autour. La couleur de la categorie teinte le halo
          plutot qu'une pastille flottante, pour un seul accent au lieu de deux. */}
      <div className="liquid-glass relative mb-6 overflow-hidden rounded-3xl px-5 py-5">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-12 size-48 rounded-full opacity-30 blur-3xl"
          style={{ backgroundColor: tint }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-2xl leading-tight font-semibold">{expense.name}</p>
              {expense.transactionId && <Landmark className="text-positive size-4 shrink-0" />}
            </div>
            {categoryLabel ? (
              <div className="mt-2 flex items-center gap-2">
                <CategoryTile
                  category={expense.category}
                  className="size-7 rounded-lg"
                  iconSize={15}
                />
                <span className="text-sm font-medium" style={{ color: tint }}>
                  {categoryLabel}
                </span>
              </div>
            ) : null}
          </div>
          {expense.fileKey ? <Receipt fileKey={expense.fileKey} /> : null}
        </div>

        <p className="relative mt-5 text-4xl font-bold tracking-tight tabular-nums">
          {toUIString(expense.amount)}
        </p>

        <div className="text-muted-foreground relative mt-3 flex flex-wrap items-center gap-x-2 text-xs">
          {!isSameDay(expense.expenseDate, expense.createdAt) ? (
            <>
              <span>{toUIDate(expense.expenseDate, { year: true })}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          {expense.deletedByUser ? (
            <span className="text-negative">
              {t('ui.deleted_by')} {displayName(expense.deletedByUser, user.id, 'dativus')}{' '}
              {t('ui.on')} {toUIDate(expense.deletedAt ?? expense.createdAt, { year: true })}
            </span>
          ) : (
            <span>
              {t('ui.added_by')} {displayName(expense.addedByUser, user.id, 'dativus')} {t('ui.on')}{' '}
              {toUIDate(expense.createdAt, { year: true })}
            </span>
          )}
          {expense.updatedByUser ? (
            <>
              <span aria-hidden>·</span>
              <span>
                {t('ui.edited_by')} {displayName(expense.updatedByUser, user.id, 'dativus')}{' '}
                {t('ui.on')} {toUIDate(expense.updatedAt, { year: true })}
              </span>
            </>
          ) : null}
        </div>

        {expense.recurrence || expense.group ? (
          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            {expense.group ? (
              <Link href={`/groups/${expense.group.id}`}>
                <Button variant="outline" size="sm" className="h-8 gap-2 rounded-full">
                  <div className="relative">
                    <Users className="size-4" />
                    {expense.group.simplifyDebts && (
                      <Merge className="absolute -top-1 -right-1 size-2" />
                    )}
                  </div>
                  {expense.group.name}
                </Button>
              </Link>
            ) : null}
            {expense.recurrence ? (
              <Link href="/recurring">
                <Button variant="outline" size="sm" className="h-8 gap-2 rounded-full">
                  <Repeat className="size-4" />
                  {i18nReady && cronString ? cronString : t('recurrence.recurring')}
                </Button>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={
            expense.paidByUser.id === user.id ? '/balances' : `/balances/${expense.paidByUser.id}`
          }
        >
          <Button variant="outline" size="sm" className="gap-2 px-2">
            <EntityAvatar entity={expense.paidByUser} size={25} />
            <span>{displayName(expense.paidByUser, user.id)}</span>
          </Button>
        </Link>
        <span className="text-gray-500">
          {t(
            `ui.expense.${expense.paidByUser.id === user.id ? 'you' : 'user'}.${expense.amount < 0 ? 'received' : 'paid'}`,
          )}
        </span>
        <span className={expense.amount > 0 ? 'text-negative' : 'text-positive'}>
          {toUIString(expense.amount)}
        </span>
      </div>
      <div className="mt-4 ml-14 flex flex-col gap-4">
        {expense.expenseParticipants
          .filter((participant) => 0n !== participant.amount)
          .map((participant) => (
            <ExpenseParticipantEntry
              key={participant.userId}
              participant={participant}
              userId={user.id}
              currency={expense.currency}
            />
          ))}
        {expense.conversionTo && (
          <>
            {expense.conversionTo.expenseParticipants
              .filter((participant) => 0n !== participant.amount)
              .map((participant) => (
                <ExpenseParticipantEntry
                  key={participant.userId}
                  participant={participant}
                  userId={user.id}
                  currency={expense.conversionTo!.currency}
                />
              ))}
          </>
        )}
      </div>
    </>
  );
};

const ExpenseParticipantEntry: React.FC<{
  participant: ExpenseDetailsOutput['expenseParticipants'][number];
  userId: number;
  currency: string;
}> = ({ participant, userId, currency }) => {
  const { displayName, t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const { toUIString } = getCurrencyHelpersCached(currency);

  const isCurrentUser = userId === participant.userId;
  const isPositive = participant.amount > 0n;
  const amountColorClass = isPositive ? 'text-positive' : 'text-negative';

  return (
    <div key={participant.userId} className="flex items-center gap-2 text-sm">
      <Link href={isCurrentUser ? '/balances' : `/balances/${participant.userId}`}>
        <Button variant="outline" size="sm" className="gap-2 px-2">
          <EntityAvatar entity={participant.user} size={25} />
          <span>{displayName(participant.user, userId)}</span>
        </Button>
      </Link>
      <span className="text-gray-500">
        {t(`ui.expense.${isCurrentUser ? 'you' : 'user'}.${isPositive ? 'get' : 'owe'}`)}
      </span>
      <span className={amountColorClass}>{toUIString(participant.amount)}</span>
    </div>
  );
};

export const EditCurrencyConversion: React.FC<{ expense: ExpenseDetailsOutput }> = ({
  expense,
}) => {
  const { setCurrency } = useAddExpenseStore((s) => s.actions);
  const { t } = useTranslationWithUtils();

  if (!expense.conversionTo) {
    toast.error(t('errors.currency_conversion_malformed'));
    console.error(
      'Malformed currency conversion data: no conversionTo present, please report this issue.',
    );
    return null;
  }

  const addOrEditCurrencyConversionMutation = api.expense.addOrEditCurrencyConversion.useMutation();
  const apiUtils = api.useUtils();

  const onClick = useCallback(() => {
    if (expense.conversionTo && isCurrencyCode(expense.conversionTo.currency)) {
      setCurrency(expense.conversionTo.currency);
    }
  }, [expense, setCurrency]);

  const sender = expense.paidByUser;
  const receiver = expense.expenseParticipants.find((p) => p.userId !== expense.paidBy)?.user;

  if (!sender || !receiver || !isCurrencyCode(expense.currency)) {
    return null;
  }

  const onSubmit: ComponentProps<typeof CurrencyConversion>['onSubmit'] = useCallback(
    async (data) => {
      await addOrEditCurrencyConversionMutation.mutateAsync({
        ...data,
        senderId: sender.id,
        receiverId: receiver.id,
        groupId: expense.groupId,
        expenseId: expense.id,
      });
      await apiUtils.invalidate();
    },
    [
      addOrEditCurrencyConversionMutation,
      sender.id,
      receiver.id,
      expense.groupId,
      expense.id,
      apiUtils,
    ],
  );

  return (
    <CurrencyConversion
      amount={expense.amount}
      currency={expense.currency}
      onSubmit={onSubmit}
      editingRate={Math.abs(Number(expense.conversionTo?.amount) / Number(expense.amount))}
    >
      <Button variant="ghost" onClick={onClick}>
        <PencilIcon className="mr-1 h-4 w-4" />
      </Button>
    </CurrencyConversion>
  );
};

export const EditSettlement: React.FC<{ expense: ExpenseDetailsOutput }> = ({ expense }) => {
  const { displayName, t, getCurrencyHelpersCached } = useTranslationWithUtils();

  const sender = expense.paidByUser;
  const receiver = expense.expenseParticipants.find((p) => p.userId !== expense.paidBy)?.user;

  const [amount, setAmount] = useState<bigint>(BigMath.abs(expense.amount));
  const [expenseDate, setExpenseDate] = useState<Date>(expense.expenseDate);
  const [amountStr, setAmountStr] = useState<string>(
    getCurrencyHelpersCached(expense.currency).toUIString(BigMath.abs(expense.amount)),
  );

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();
  const apiUtils = api.useUtils();

  const onCurrencyInputValueChange = useCallback(
    ({ strValue, bigIntValue }: { strValue?: string; bigIntValue?: bigint }) => {
      if (strValue !== undefined) {
        setAmountStr(strValue);
      }
      if (bigIntValue !== undefined) {
        setAmount(bigIntValue);
      }
    },
    [],
  );

  const saveExpense = useCallback(() => {
    if (!amount || !sender || !receiver) {
      return;
    }

    addExpenseMutation.mutate(
      {
        expenseId: expense.id,
        name: t('ui.settle_up_name'),
        currency: expense.currency,
        amount,
        splitType: SplitType.SETTLEMENT,
        participants: [
          {
            userId: sender.id,
            amount,
          },
          {
            userId: receiver.id,
            amount: -amount,
          },
        ],
        paidBy: sender.id,
        category: DEFAULT_CATEGORY,
        groupId: expense.groupId,
        expenseDate,
      },
      {
        onSuccess: () => {
          apiUtils.invalidate().catch(console.error);
        },
        onError: (error) => {
          console.error('Error while saving expense:', error);
          toast.error(t('errors.saving_expense'));
        },
      },
    );
  }, [amount, sender, receiver, expense, addExpenseMutation, expenseDate, apiUtils, t]);

  if (!sender || !receiver) {
    return null;
  }

  return (
    <AppDrawer
      trigger={
        <Button variant="ghost">
          <PencilIcon className="mr-1 h-4 w-4" />
        </Button>
      }
      leftAction={t('actions.back')}
      title={t('ui.settlement')}
      actionTitle={t('actions.save')}
      actionOnClick={saveExpense}
      actionDisabled={!amount}
      className="h-[70vh]"
      shouldCloseOnAction
    >
      <div className="mt-10 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-5">
            <EntityAvatar entity={sender} />
            <ArrowRightIcon className="h-6 w-6 text-gray-600" />
            <EntityAvatar entity={receiver} />
          </div>
          <p className="mt-2 text-center text-sm text-gray-400">
            {displayName(sender)} {t('ui.expense.user.pay')} {displayName(receiver)}
          </p>
          {expense.group ? (
            <p className="mt-1 text-center text-xs text-gray-500">{expense.group.name}</p>
          ) : null}
        </div>
        <CurrencyInput
          currency={expense.currency}
          strValue={amountStr}
          className="mx-auto mt-4 w-37.5 text-center text-lg"
          onValueChange={onCurrencyInputValueChange}
        />
        <DateSelector
          mode="single"
          required
          selected={expenseDate}
          onSelect={setExpenseDate}
          popoverPortalled={false}
        />
      </div>
    </AppDrawer>
  );
};

export default ExpenseDetails;
