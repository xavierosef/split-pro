import { ChevronRight, Landmark, X } from 'lucide-react';
import { useRouter } from 'next/router';
import React, { useCallback } from 'react';

import { useCategoryMemory } from '~/hooks/useCategoryMemory';
import { getAutoFocusTarget } from '~/lib/autoFocusPreference';
import { DEFAULT_CATEGORY } from '~/lib/category';
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

// La ligne entiere est le declencheur : AppDrawer / Popover la clonent via
// Radix Slot, il faut donc relayer ref et props (onClick en tete). Slot
// concatene aussi sa className apres la notre, d'ou l'alignement en style
// inline : c'est le seul niveau qu'il ne peut pas ecraser.
const OptionRow = React.forwardRef<
  HTMLElement,
  React.ComponentProps<'button'> & { label: string; muted?: boolean; as?: 'button' | 'span' }
>(({ label, children, className, muted, as = 'button', ...props }, ref) => {
  const Tag = as as 'button';
  return (
    <Tag
      ref={ref as React.Ref<HTMLButtonElement>}
      {...('button' === as ? { type: 'button' as const } : {})}
      style={{ justifyContent: 'space-between', textAlign: 'left' }}
      className={cn(
        'hover:bg-muted/40 flex min-h-14 w-full items-center gap-3 px-4 transition-colors',
        className,
      )}
      {...props}
    >
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="flex min-w-0 items-center gap-1">
        <span className={cn('truncate text-base', muted ? 'text-muted-foreground' : 'text-primary')}>
          {children}
        </span>
        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
      </span>
    </Tag>
  );
});
OptionRow.displayName = 'OptionRow';

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

  const { t, displayName, generateSplitDescription, getCurrencyHelpersCached, toUIDate } =
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

  // La categorie devinee reste modifiable : des que l'utilisateur en choisit
  // une lui-meme, la memoire se tait jusqu'a la depense suivante.
  const suggestCategoryFor = useCategoryMemory();
  const suggestedRef = React.useRef<string | null>(null);

  const onCategoryPick = useCallback(
    (picked: string) => {
      suggestedRef.current = null;
      setCategory(picked);
    },
    [setCategory],
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.toString() ?? '';
      setDescription(value);

      if (expenseId || (category !== DEFAULT_CATEGORY && category !== suggestedRef.current)) {
        return;
      }

      const guess = suggestCategoryFor(value);
      suggestedRef.current = guess;
      setCategory(guess ?? DEFAULT_CATEGORY);
    },
    [setDescription, setCategory, suggestCategoryFor, category, expenseId],
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

  const descriptionRef = React.useRef<HTMLInputElement>(null);
  const amountRef = React.useRef<HTMLInputElement>(null);

  // Le clavier doit sortir sur le champ que l'utilisateur remplit en premier :
  // le montant par defaut, la description si c'est son habitude.
  React.useEffect(() => {
    const target = getAutoFocusTarget();
    if ('none' === target) {
      return;
    }
    const timer = setTimeout(() => {
      const el = 'amount' === target ? amountRef.current : descriptionRef.current;
      el?.focus();
    }, 220);
    return () => clearTimeout(timer);
  }, []);

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
            <CategoryPicker category={category} onCategoryPick={onCategoryPick} />
            <Input
              ref={descriptionRef}
              placeholder={t('expense_details.add_expense_details.description_placeholder')}
              value={description}
              onChange={handleDescriptionChange}
              className="text-lg placeholder:text-sm"
              onKeyDown={(e) => {
                if ('Enter' === e.key) {
                  amountRef.current?.focus();
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <CurrencyPicker currentCurrency={currency} onCurrencyPick={onCurrencyPick} />
            <CurrencyInput
              ref={amountRef}
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
              <div className="bg-muted/40 mt-5 divide-y divide-white/5 overflow-hidden rounded-2xl">
                <PayerSelectionForm>
                  <OptionRow label={t(`ui.expense.${isNegative ? 'received_by' : 'paid_by'}`)}>
                    {displayName(paidBy, currentUser?.id, 'dativus')}
                  </OptionRow>
                </PayerSelectionForm>

                <SplitExpenseForm>
                  <OptionRow label={t('expense_details.add_expense_details.split_label')}>
                    {generateSplitDescription(
                      splitType,
                      participants,
                      splitShares,
                      paidBy,
                      currentUser,
                    )}
                  </OptionRow>
                </SplitExpenseForm>

                <DateSelector
                  mode="single"
                  required
                  selected={expenseDate}
                  onSelect={setExpenseDate}
                >
                  <OptionRow label={t('expense_details.add_expense_details.date_label')}>
                    {toUIDate(expenseDate, { useToday: true })}
                  </OptionRow>
                </DateSelector>

                {!expenseId && (
                  <RecurrenceInput>
                    <OptionRow
                      label={t('expense_details.add_expense_details.recurrence_label')}
                      muted={!cronExpression}
                    >
                      {cronExpression
                        ? t('expense_details.add_expense_details.recurrence_on')
                        : t('expense_details.add_expense_details.recurrence_off')}
                    </OptionRow>
                  </RecurrenceInput>
                )}

                <UploadFile>
                  <OptionRow
                    as="span"
                    label={t('expense_details.add_expense_details.receipt_label')}
                    muted={!fileKey}
                  >
                    {fileKey
                      ? t('expense_details.add_expense_details.receipt_added')
                      : t('expense_details.add_expense_details.receipt_none')}
                  </OptionRow>
                </UploadFile>
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

