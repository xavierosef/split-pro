import { KeyRound, Trash2 } from 'lucide-react';
import React, { useCallback } from 'react';
import { toast } from 'sonner';

import { SimpleConfirmationDialog } from '~/components/SimpleConfirmationDialog';
import { Button } from '~/components/ui/button';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { type RouterOutputs, api } from '~/utils/api';

type ShortcutTokenItem = RouterOutputs['shortcut']['getTokens'][number];

const TokenRow: React.FC<{
  token: ShortcutTokenItem;
  onRevoke: (id: string) => Promise<void>;
  revoking: boolean;
}> = ({ token, onRevoke, revoking }) => {
  const { t, toUIDate } = useTranslationWithUtils();

  const handleRevoke = useCallback(() => onRevoke(token.id), [onRevoke, token.id]);

  const targetName = token.group?.name ?? token.friend?.name ?? token.friend?.email ?? '—';

  return (
    <div className="flex items-start justify-between gap-3 border-b py-3 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <KeyRound className={token.revokedAt ? 'size-4 text-gray-500' : 'size-4 text-teal-500'} />
          <span className="truncate font-medium">{token.name}</span>
        </div>
        <span className="text-sm text-gray-400">
          {t('shortcuts.token_row_target', { target: targetName })}
        </span>
        <span className="text-xs text-gray-500">
          <code>{token.tokenPrefix}…</code>
          {' · '}
          {token.revokedAt
            ? t('shortcuts.token_revoked_on', { date: toUIDate(token.revokedAt) })
            : token.lastUsedAt
              ? t('shortcuts.token_last_used', { date: toUIDate(token.lastUsedAt) })
              : t('shortcuts.token_never_used')}
          {' · '}
          {t('shortcuts.token_expense_count', { count: token.expenseCount })}
        </span>
      </div>

      {!token.revokedAt && (
        <SimpleConfirmationDialog
          title={t('shortcuts.revoke_title')}
          description={t('shortcuts.revoke_description')}
          hasPermission
          loading={revoking}
          onConfirm={handleRevoke}
          variant="destructive"
        >
          <Button variant="ghost" size="sm" className="text-orange-600">
            <Trash2 className="size-4" />
          </Button>
        </SimpleConfirmationDialog>
      )}
    </div>
  );
};

export const ShortcutTokenList: React.FC = () => {
  const { t } = useTranslationWithUtils();
  const utils = api.useUtils();
  const tokensQuery = api.shortcut.getTokens.useQuery();
  const revokeMutation = api.shortcut.revokeToken.useMutation();

  const onRevoke = useCallback(
    async (tokenId: string) => {
      try {
        await revokeMutation.mutateAsync({ tokenId });
        await utils.shortcut.getTokens.invalidate();
        toast.success(t('shortcuts.token_revoked'), { duration: 1500 });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('shortcuts.token_revoke_error'));
      }
    },
    [revokeMutation, utils.shortcut.getTokens, t],
  );

  if (!tokensQuery.data?.length) {
    return <p className="text-sm text-gray-400">{t('shortcuts.no_tokens')}</p>;
  }

  return (
    <div className="flex flex-col">
      {tokensQuery.data.map((token) => (
        <TokenRow
          key={token.id}
          token={token}
          onRevoke={onRevoke}
          revoking={revokeMutation.isPending}
        />
      ))}
    </div>
  );
};
