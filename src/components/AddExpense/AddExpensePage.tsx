import { TRPCClientError } from '@trpc/client';
import { ChevronRight, Landmark, MessageSquare, X } from 'lucide-react';
import { useRouter } from 'next/router';
import React, { useCallback } from 'react';

import { useCategoryMemory } from '~/hooks/useCategoryMemory';
import { getAutoFocusTarget } from '~/lib/autoFocusPreference';
import { DEFAULT_CATEGORY } from '~/lib/category';
import { CURRENCIES, type CurrencyCode } from '~/lib/currency';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';

import { toast } from 'sonner';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { cronToBackend } from '~/lib/cron';
import { cn } from '~/lib/utils';
import { Button } from '../ui/button';
import { Input, MultilineInput } from '../ui/input';
import AddBankTransactions from './AddBankTransactions';
import { CategoryPicker } from './CategoryPicker';
import { CurrencyPicker } from './CurrencyPicker';
import { DateSelector } from './DateSelector';
import { EditRecurrenceDialog } from '../Expense/EditRecurrenceDialog';
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
import { isStringQueryParam } from '~/utils/queryParams';

/*
 * La ligne entiere est le declencheur : AppDrawer / Popover la clonent via
 * Radix Slot, il faut donc relayer ref et props (onClick en tete). Slot
 * concatene aussi sa className apres la notre, d'ou l'alignement en style
 * inline : c'est le seul niveau qu'il ne peut pas ecraser.
 */
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
        <span
          className={cn('truncate text-base', muted ? 'text-muted-foreground' : 'text-primary')}
        >
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
  recurrence?: { id: number; schedule: string };
}> = ({ enableSendingInvites, expenseId, bankConnectionEnabled, recurrence }) => {
  const [initialComment, setInitialComment] = React.useState('');
  const [showInitialComment, setShowInitialComment] = React.useState(false);
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
  const [previousCurrency, setPreviousCurrency] = React.useState<CurrencyCode | null>(null);

  const { t, displayName, generateSplitDescription, getCurrencyHelpersCached, toUIDate } =
    useTranslationWithUtils();

  const {
    setCurrency,
    setCategory,
    setDescription,
    setAmount,
    setAmountStr,
    resetState,
    setExpenseDate,
    setMultipleTransactions,
    setIsTransactionLoading,
    setSingleTransaction,
    setCronExpression,
  } = useAddExpenseStore((s) => s.actions);

  const apiUtils = api.useUtils();
  const addExpenseMutation = api.expense.addOrEditExpense.useMutation({
    onSuccess: () => apiUtils.expense.invalidate(),
  });
  const updateProfile = api.user.updateUserDetail.useMutation();
  const { update } = useSession();

  const onCurrencyPick = useCallback(
    (newCurrency: CurrencyCode | null) => {
      if (!newCurrency) {
        return;
      }

      updateProfile.mutate({ currency: newCurrency });

      setPreviousCurrency(currency);
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
      setPreviousCurrency(null);
    },
    [setAmount, setAmountStr],
  );

  const addExpense = useCallback(async () => {
    if (!paidBy) {
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
            initialComment: expenseId ? undefined : initialComment,
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
                  setInitialComment('');
                  setShowInitialComment(false);
                }
                return;
              } else {
                const id = d.length > 0 ? d[0]?.id : expenseId;

                let navPromise: () => Promise<any> = () => Promise.resolve(true);

                const { friendId, groupId } = router.query;

                if (isStringQueryParam(friendId) && friendId && !groupId) {
                  navPromise = () => router.push(`/balances/${friendId}/expenses/${id}`);
                } else if (isStringQueryParam(groupId) && groupId) {
                  navPromise = () => router.push(`/groups/${groupId}/expenses/${id}`);
                } else {
                  navPromise = () => router.push(`/expenses/${id}?keepAdding=1`);
                }

                if (expenseId) {
                  navPromise = async () => router.back();
                }

                navPromise()
                  .then(() =>
                    update((session: any) => ({
                      ...session,
                      user: {
                        ...(session?.user ?? {}),
                        currency,
                      },
                    })),
                  )
                  .catch(console.error);
              }
            }
          },
        },
      );
    } catch (error) {
      console.error(error);
      if (error instanceof TRPCClientError && error.data?.zodError) {
        toast.error(t('errors.expense_invalid_input'));
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(t('errors.expense_submission_failed'));
      }
    }
  }, [
    initialComment,
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
    setMultipleTransactions,
    transactionId,
    setIsTransactionLoading,
    cronExpression,
    multipleTransactions,
    setSingleTransaction,
    t,
    update,
  ]);

  /*
   * La categorie devinee reste modifiable : des que l'utilisateur en choisit
   * une lui-meme, la memoire se tait jusqu'a la depense suivante.
   */
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
      const value = e.target.value ?? '';
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
    setInitialComment('');
    setShowInitialComment(false);
    setMultipleTransactions([]);
  }, [resetState, setMultipleTransactions]);

  const onConvertAmount: React.ComponentProps<typeof CurrencyConversion>['onSubmit'] = useCallback(
    ({ amount: absAmount, rate }) => {
      if (!previousCurrency) {
        return;
      }

      const targetAmount =
        (absAmount >= 0n ? 1n : -1n) *
        currencyConversion({
          amount: absAmount,
          rate,
          from: previousCurrency,
          to: currency,
        });
      setAmount(targetAmount);
      setAmountStr(getCurrencyHelpersCached(currency).toUIString(targetAmount, false, true));
      setPreviousCurrency(null);
    },
    [setAmount, setAmountStr, currency, getCurrencyHelpersCached, previousCurrency],
  );

  const currencyConversionComponent = React.useMemo(() => {
    if (currency === previousCurrency || previousCurrency === null || !amount || 0n === amount) {
      return null;
    }

    return (
      <CurrencyConversion
        onSubmit={onConvertAmount}
        amount={amount}
        currency={previousCurrency}
        editingTargetCurrency={currency}
      >
        <Button size="icon" variant="secondary" className="size-8">
          <CurrencyConversionIcon className="size-4" />
        </Button>
      </CurrencyConversion>
    );
  }, [amount, currency, onConvertAmount, previousCurrency]);

  const descriptionRef = React.useRef<HTMLInputElement>(null);
  const amountRef = React.useRef<HTMLInputElement>(null);

  const fieldsVisible = !(showFriends || (1 === participants.length && !group));

  /*
   * Le clavier doit sortir sur le champ rempli en premier : le montant par
   * defaut, la description si c'est l'habitude. Le focus part du montage reel
   * des champs, pas d'un delai fixe : les champs n'apparaissent qu'une fois le
   * groupe charge, et tout intervalle sans input focalise referme le clavier
   * amorce par primeAddExpenseKeyboard.
   */
  React.useEffect(() => {
    if (!fieldsVisible) {
      return;
    }
    const target = getAutoFocusTarget();
    if ('none' === target) {
      return;
    }
    const el = 'amount' === target ? amountRef.current : descriptionRef.current;
    el?.focus();
  }, [fieldsVisible]);

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
              className="h-14 rounded-2xl text-lg placeholder:text-sm"
              onKeyDown={(e) => {
                if ('Enter' === e.key) {
                  amountRef.current?.focus();
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <CurrencyPicker
              currentCurrency={currency}
              onCurrencyPick={onCurrencyPick}
              trigger={
                <Button
                  variant="outline"
                  className="h-14 w-16 shrink-0 rounded-2xl p-0 text-2xl font-medium"
                >
                  {CURRENCIES[currency]?.symbolNative ?? currency}
                </Button>
              }
            />
            <CurrencyInput
              ref={amountRef}
              placeholder={t('expense_details.add_expense_details.amount_placeholder')}
              currency={currency}
              strValue={amtStr}
              allowNegative
              hideSymbol
              onValueChange={onUpdateAmount}
              className="h-14 rounded-2xl"
              rightIcon={currencyConversionComponent}
            />
          </div>
          {!expenseId && (
            <div className="grid h-20 grid-cols-[73px_minmax(0,1fr)] items-start gap-2">
              <button
                type="button"
                className="ring-offset-background flex h-10 w-full items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
                aria-label={t('comments.initial_label')}
                title={t('comments.initial_label')}
                aria-expanded={showInitialComment}
                aria-controls="initial-expense-comment"
                onClick={() => setShowInitialComment(!showInitialComment)}
              >
                <MessageSquare
                  className={cn(
                    'size-6',
                    showInitialComment || initialComment.trim() ? 'text-primary' : 'text-gray-300',
                  )}
                />
              </button>
              {showInitialComment && (
                <MultilineInput
                  id="initial-expense-comment"
                  aria-label={t('comments.initial_label')}
                  value={initialComment}
                  onChange={(event) => setInitialComment(event.target.value)}
                  maxLength={5000}
                  placeholder={t('comments.initial_placeholder')}
                  autoFocus
                />
              )}
            </div>
          )}
          {amount && '' !== description ? (
            <>
              <div className="bg-muted/40 mt-5 divide-y divide-white/5 overflow-hidden rounded-2xl">
                <PayerSelectionForm>
                  <OptionRow label={t(`ui.expense.${isNegative ? 'received_by' : 'paid_by'}`)}>
                    {paidBy?.id === currentUser?.id
                      ? t(`ui.expense.${isNegative ? 'recipient' : 'payer'}.current_user`)
                      : displayName(paidBy)}
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
                      isNegative,
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

                {!recurrence && (
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
                {expenseId && recurrence && (
                  <EditRecurrenceDialog
                    recurrenceId={recurrence.id}
                    currentSchedule={cronExpression || recurrence.schedule}
                    onScheduleChange={setCronExpression}
                  >
                    <OptionRow label={t('expense_details.add_expense_details.recurrence_label')}>
                      {t('expense_details.add_expense_details.recurrence_on')}
                    </OptionRow>
                  </EditRecurrenceDialog>
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
