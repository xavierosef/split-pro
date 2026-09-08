import { Copy, Plus } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import { AppDrawer } from '~/components/ui/drawer';
import { Input } from '~/components/ui/input';
import { NativeSelect, NativeSelectOption } from '~/components/ui/native-select';
import { api } from '~/utils/api';

const GROUP_PREFIX = 'group:';
const FRIEND_PREFIX = 'friend:';

/**
 * Creates a shortcut token and shows it once. The raw token is never stored, so the
 * dialog stays open on the "copy it now" step until the user dismisses it.
 */
export const CreateShortcutToken: React.FC = () => {
  const { t } = useTranslation();
  const utils = api.useUtils();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [rawToken, setRawToken] = useState<string | null>(null);

  const groupsQuery = api.group.getAllGroups.useQuery();
  const friendsQuery = api.user.getFriends.useQuery();
  const createTokenMutation = api.shortcut.createToken.useMutation();

  const groups = useMemo(
    () => groupsQuery.data?.map(({ group }) => group).filter((group) => !group.archivedAt) ?? [],
    [groupsQuery.data],
  );

  const onNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value),
    [],
  );

  const onTargetChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => setTarget(event.target.value),
    [],
  );

  const onCopy = useCallback(async () => {
    if (!rawToken) {
      return;
    }

    await navigator.clipboard.writeText(rawToken);
    toast.success(t('shortcuts.token_copied'), { duration: 1500 });
  }, [rawToken, t]);

  const onCreate = useCallback(async () => {
    if ('' === name.trim() || '' === target) {
      return;
    }

    try {
      const result = await createTokenMutation.mutateAsync({
        name: name.trim(),
        target: target.startsWith(GROUP_PREFIX)
          ? { type: 'group', groupId: Number(target.slice(GROUP_PREFIX.length)) }
          : { type: 'friend', friendId: Number(target.slice(FRIEND_PREFIX.length)) },
      });

      setRawToken(result.rawToken);
      setName('');
      setTarget('');
      await utils.shortcut.getTokens.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('shortcuts.token_create_error'));
    }
  }, [createTokenMutation, name, target, utils.shortcut.getTokens, t]);

  const onOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setRawToken(null);
    }
  }, []);

  const trigger = useMemo(
    () => (
      <Button size="sm" className="gap-1">
        <Plus className="size-4" />
        {t('shortcuts.new_token')}
      </Button>
    ),
    [t],
  );

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={t('shortcuts.new_token')}
      actionTitle={rawToken ? undefined : t('actions.create')}
      actionOnClick={rawToken ? undefined : onCreate}
      actionDisabled={'' === name.trim() || '' === target || createTokenMutation.isPending}
    >
      {rawToken ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-400">{t('shortcuts.token_shown_once')}</p>
          <code className="bg-muted rounded-md p-3 text-xs break-all">{rawToken}</code>
          <Button variant="outline" className="gap-2" onClick={onCopy}>
            <Copy className="size-4" />
            {t('actions.copy')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400" htmlFor="shortcut-token-name">
              {t('shortcuts.token_name')}
            </label>
            <Input
              id="shortcut-token-name"
              value={name}
              onChange={onNameChange}
              placeholder={t('shortcuts.token_name_placeholder')}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400" htmlFor="shortcut-token-target">
              {t('shortcuts.token_target')}
            </label>
            <NativeSelect
              id="shortcut-token-target"
              className="w-full"
              value={target}
              onChange={onTargetChange}
            >
              <NativeSelectOption value="">{t('shortcuts.token_target_pick')}</NativeSelectOption>
              {groups.map((group) => (
                <NativeSelectOption key={`group-${group.id}`} value={`${GROUP_PREFIX}${group.id}`}>
                  {group.name}
                </NativeSelectOption>
              ))}
              {friendsQuery.data?.map((friend) => (
                <NativeSelectOption
                  key={`friend-${friend.id}`}
                  value={`${FRIEND_PREFIX}${friend.id}`}
                >
                  {friend.name ?? friend.email}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <p className="text-xs text-gray-500">{t('shortcuts.token_target_help')}</p>
          </div>
        </div>
      )}
    </AppDrawer>
  );
};
