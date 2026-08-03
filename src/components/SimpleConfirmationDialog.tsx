import { type VariantProps } from 'class-variance-authority';
import { useCallback, useState } from 'react';
import { useTranslation } from 'next-i18next';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { cn } from '~/lib/utils';
import { Button, type buttonVariants } from './ui/button';

export const SimpleConfirmationDialog: React.FC<
  {
    title: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onCancel?: () => void;
    description: React.ReactNode;
    hasPermission: boolean;
    onConfirm: () => void | Promise<void>;
    loading: boolean;
    children?: React.ReactNode;
  } & VariantProps<typeof buttonVariants>
> = ({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onCancel,
  title,
  description,
  hasPermission,
  onConfirm,
  loading,
  variant,
  children,
}) => {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof controlledOpen === 'boolean';
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent className="max-w-xs rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          {hasPermission && (
            <form
              className="w-full"
              onSubmit={async (e) => {
                e.preventDefault();
                await onConfirm();
                setOpen(false);
              }}
            >
              <Button
                type="submit"
                variant={variant}
                disabled={loading}
                loading={loading}
                className={cn(
                  'liquid-glass h-14 w-full rounded-full text-base font-semibold',
                  'destructive' === variant && 'liquid-glass--danger text-white',
                )}
              >
                {t('actions.confirm')}
              </Button>
            </form>
          )}
          <AlertDialogCancel className="mt-0 h-12 w-full rounded-full" onClick={onCancel}>
            {t('actions.cancel')}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
