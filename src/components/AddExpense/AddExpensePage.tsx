import { ChevronRight, Landmark, X } from 'lucide-react';
import { useRouter } from 'next/router';
import React, { useCallback } from 'react';

import { type CurrencyCode } from '~/lib/currency';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';

import { toast } from 'sonner';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { cronToBackend } from '~/lib/cron';
import { cn } from '~/lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import AddBankTransactions from './AddBankTransactions';
import { CategoryPicker } from './CategoryPicker';
import { CurrencyPicker } from './CurrencyPicker';
import { DateSelector } from './DateSelector';
import { RecurrenceInput } from './RecurrenceInput';
import { SelectUserOrGroup } from './SelectUserOrGroup';
import { PayerSelectionForm, SplitExpenseForm } from './SplitTypeSection';
import { UploadFile } from './UploadFile';
import { UserInput } from './UserInput';
import { CurrencyInput } from '../ui/currency-input';
import { CurrencyConversion } from '../Friend/CurrencyConversion';
import { currencyConversion } from '~/utils/numbers';
import { CurrencyConversionIcon } from '../ui/categoryIcons';
import { useSession } from 'next-auth/react';

const OptionRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex min-h-13 items-center justify-between gap-3 px-4 py-1.5">
    <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
    <div className="flex min-w-0 items-center justify-end">{children}</div>
  </div>
);

const OptionValue: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Button
    variant="ghost"
    className="text-primary h-8 max-w-full min-w-0 justify-end gap-1 px-1 text-right text-base"
  >
    <span className="truncate">{children}</span>
    <ChevronRight className="text-muted-foreground size-4 shrink-0" />
  </Button>
);

export const AddOrEditExpensePage: React.FC<{
  enableSendingInvites: boolean;
  expenseId?: string;
  bankConnectionEnabled: boolean;
}> = ({ enableSendingInvites, expenseId, bankConnectionEnabled }) => {
  const showFriends = useAddExpenseStore((s) => s.showFriends);
  const amount = useAddExpenseStore((s) => s.amount);
  const isNegative = useAddExpenseStore((s) => s.isNegative);
  const participants = useAddExpenseStore((s) => s.participants);
  const group = useAddExpenseStore((s) => s.group);
  const currency = useAddExpenseStore((s) => s.currency);
  const category = useAddExpenseStore((s) => s.category);
  const description = useAddExpenseStore((s) => s.description);
  const isFileUploading = useAddExpenseStore((s) => s.isFileUploading);
  const amtStr = useAddExpenseStore((s) => s.amountStr);
  const expenseDate = useAddExpenseStore((s) => s.expenseDate);
  const isExpenseSettled = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const paidBy = useAddExpenseStore((s) => s.paidBy);
  const splitType = useAddExpenseStore((s) => s.splitType);
  const fileKey = useAddExpenseStore((s) => s.fileKey);
  const currentUser = useAddExpenseStore((s) => s.currentUser);
  const splitShares = useAddExpenseStore((s) => s.splitShares);
  const transactionId = useAddExpenseStore((s) => s.transactionId);
  const cronExpression = useAddExpenseStore((s) => s.cronExpression);
  const multipleTransactions = useAddExpenseStore((s) => s.multipleTransactions);

  const { t, displayName, generateSplitDescription, getCurrencyHelpersCached } =
    useTranslationWithUtils();

  const {
    setCurrency,
    setCategory,
    setDescription,
    setAmount,
    setAmountStr,
    resetState,
    setSplitScreenOpen,
    setExpenseDate,
    setMultipleTransactions,
    setIsTransactionLoading,
    setSingleTransaction,
  } = useAddExpenseStore((s) => s.actions);

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();
  const updateProfile = api.user.updateUserDetail.useMutation();
  const { update } = useSession();

  const onCurrencyPick = useCallback(
    (newCurrency: CurrencyCode | null) => {
      if (!newCurrency) {
        return;
      }

      updateProfile.mutate({ currency: newCurrency });

      previousCurrencyRef.current = currency;
      setCurrency(newCurrency);
    },
    [currency, setCurrency, updateProfile],
  );

  const router = useRouter();

  const onUpdateAmount = useCallback(
    ({ strValue, bigIntValue }: { strValue?: string; bigIntValue?: bigint }) => {
      if (strValue !== undefined) {
        setAmountStr(strValue);
      }
      if (bigIntValue !== undefined) {
        setAmount(bigIntValue);
      }
      previousCurrencyRef.current = null;
    },
    [setAmount, setAmountStr],
  );

  const addExpense = useCallback(async () => {
    if (!paidBy) {
      return;
    }

    if (!isExpenseSettled) {
      setSplitScreenOpen(true);
      return;
    }

    setMultipleTransactions([]);
    setIsTransactionLoading(false);

    const sign = isNegative ? -1n : 1n;

    try {
      await addExpenseMutation.mutateAsync(
        [
          {
            name: description,
            currency,
            amount: amount * sign,
            groupId: group?.id ?? null,
            splitType,
            participants: participants.map((p) => ({
              userId: p.id,
              amount: (p.amount ?? 0n) * sign,
            })),
            paidBy: paidBy.id,
            category,
            fileKey,
            expenseDate,
            expenseId,
            transactionId,
            cronExpression: cronExpression ? cronToBackend(cronExpression) : undefined,
          },
        ],
        {
          onSuccess: (d) => {
            if (d) {
              if (multipleTransactions.length > 0) {
                const allTransactions = [...multipleTransactions];
                const transactionToAdd = allTransactions.pop();
                if (transactionToAdd) {
                  setMultipleTransactions(allTransactions);
                  setSingleTransaction(transactionToAdd);
                }
                return;
              } else {
                const id = d.length > 0 ? d[0]?.id : expenseId;

                let navPromise: () => Promise<any> = () => Promise.resolve(true);

                const { friendId, groupId } = router.query;

                if (friendId && !groupId) {
                  navPromise = () => router.push(`/balances/${friendId as string}/expenses/${id}`);
                } else if (groupId) {
                  navPromise = () => router.push(`/groups/${groupId as string}/expenses/${id}`);
                } else {
                  navPromise = () => router.push(`/expenses/${id}?keepAdding=1`);
                }

                if (expenseId) {
                  navPromise = async () => router.back();
                }

                navPromise().catch(console.error);
                update((session: any) => ({
                  ...session,
                  user: {
                    ...(session?.user ?? {}),
                    currency,
                  },
                })).catch(console.error);
              }
            }
          },
        },
      );
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred while submitting the expense.');
      }
    }
  }, [
    setSplitScreenOpen,
    description,
    currency,
    isNegative,
    amount,
    participants,
    category,
    expenseDate,
    expenseId,
    router,
    addExpenseMutation,
    group,
    paidBy,
    splitType,
    fileKey,
    isExpenseSettled,
    setMultipleTransactions,
    transactionId,
    setIsTransactionLoading,
    cronExpression,
    multipleTransactions,
    setSingleTransaction,
    update,
  ]);

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDescription(e.target.value.toString() ?? '');
    },
    [setDescription],
  );

  const clearTransaction = useCallback(() => {
    resetState();
    setMultipleTransactions([]);
  }, [resetState, setMultipleTransactions]);

  const previousCurrencyRef = React.useRef<CurrencyCode | null>(null);

  const onConvertAmount: React.ComponentProps<typeof CurrencyConversion>['onSubmit'] = useCallback(
    ({ amount: absAmount, rate }) => {
      if (!previousCurrencyRef.current) {
        return;
      }

      const targetAmount =
        (absAmount >= 0n ? 1n : -1n) *
        currencyConversion({
          amount: absAmount,
          rate,
          from: previousCurrencyRef.current,
          to: currency,
        });
      setAmount(targetAmount);
      setAmountStr(getCurrencyHelpersCached(currency).toUIString(targetAmount, false, true));
      previousCurrencyRef.current = null;
    },
    [setAmount, setAmountStr, currency, getCurrencyHelpersCached],
  );

  const currencyConversionComponent = React.useMemo(() => {
    if (
      currency === previousCurrencyRef.current ||
      previousCurrencyRef.current === null ||
      !amount ||
      0n === amount
    ) {
      return null;
    }

    return (
      <CurrencyConversion
        onSubmit={onConvertAmount}
        amount={amount}
        currency={previousCurrencyRef.current}
        editingTargetCurrency={currency}
      >
        <Button size="icon" variant="secondary" className="size-8">
          <CurrencyConversionIcon className="size-4" />
        </Button>
      </CurrencyConversion>
    );
  }, [amount, currency, onConvertAmount]);

  const onBackButtonPress = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="text-primary px-0" onClick={onBackButtonPress}>
          {t('actions.cancel')}
        </Button>
        <div className="text-center">
          {expenseId ? t('actions.edit_expense') : t('actions.add_expense')}
        </div>
        <div className="w-16" />
      </div>
      {!group && <UserInput isEditing={Boolean(expenseId)} />}
      {showFriends || (1 === participants.length && !group) ? (
        <SelectUserOrGroup enableSendingInvites={enableSendingInvites} />
      ) : (
        <>
          <div className="mt-4 flex gap-2 sm:mt-10">
            <CategoryPicker category={category} onCategoryPick={setCategory} />
            <Input
              placeholder={t('expense_details.add_expense_details.description_placeholder')}
              value={description}
              onChange={handleDescriptionChange}
              className="text-lg placeholder:text-sm"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <CurrencyPicker currentCurrency={currency} onCurrencyPick={onCurrencyPick} />
            <CurrencyInput
              placeholder={t('expense_details.add_expense_details.amount_placeholder')}
              currency={currency}
              strValue={amtStr}
              allowNegative
              hideSymbol
              onValueChange={onUpdateAmount}
              rightIcon={currencyConversionComponent}
            />
          </div>
          {amount && '' !== description ? (
            <>
              <div className="bg-muted/40 mt-5 divide-y divide-white/5 rounded-2xl">
                <OptionRow label={t(`ui.expense.${isNegative ? 'received_by' : 'paid_by'}`)}>
                  <PayerSelectionForm>
                    <OptionValue>{displayName(paidBy, currentUser?.id, 'dativus')}</OptionValue>
                  </PayerSelectionForm>
                </OptionRow>

                <OptionRow label={t('expense_details.add_expense_details.split_label')}>
                  <SplitExpenseForm>
                    <OptionValue>
                      {generateSplitDescription(
                        splitType,
                        participants,
                        splitShares,
                        paidBy,
                        currentUser,
                      )}
                    </OptionValue>
                  </SplitExpenseForm>
                </OptionRow>

                <OptionRow label={t('expense_details.add_expense_details.date_label')}>
                  <DateSelector
                    mode="single"
                    required
                    selected={expenseDate}
                    onSelect={setExpenseDate}
                  />
                </OptionRow>

                {!expenseId && (
                  <OptionRow label={t('expense_details.add_expense_details.recurrence_label')}>
                    <RecurrenceInput>
                      <OptionValue>
                        {cronExpression
                          ? t('expense_details.add_expense_details.recurrence_on')
                          : t('expense_details.add_expense_details.recurrence_off')}
                      </OptionValue>
                    </RecurrenceInput>
                  </OptionRow>
                )}

                <OptionRow label={t('expense_details.add_expense_details.receipt_label')}>
                  <UploadFile />
                </OptionRow>

                {bankConnectionEnabled && (
                  <OptionRow label={t('bank_transactions.to_bank')}>
                    <div className="flex items-center gap-2">
                      <AddBankTransactions bankConnectionEnabled={bankConnectionEnabled}>
                        <Button variant="ghost" className="px-2">
                          <Landmark
                            className={cn(
                              transactionId ? 'text-primary' : 'text-muted-foreground',
                              'size-5',
                            )}
                          />
                        </Button>
                      </AddBankTransactions>
                      {transactionId && (
                        <Button
                          variant="ghost"
                          className="px-2 text-red-500"
                          onClick={clearTransaction}
                        >
                          <X className="size-5" />
                        </Button>
                      )}
                    </div>
                  </OptionRow>
                )}
              </div>

              <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] z-40 lg:static lg:mt-8">
                <Button
                  className="liquid-glass liquid-glass--accent h-14 w-full rounded-full text-base font-semibold text-white"
                  loading={addExpenseMutation.isPending || isFileUploading}
                  disabled={
                    addExpenseMutation.isPending ||
                    !amount ||
                    '' === description ||
                    isFileUploading ||
                    !isExpenseSettled
                  }
                  onClick={addExpense}
                >
                  {t('actions.save')}
                </Button>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
};

