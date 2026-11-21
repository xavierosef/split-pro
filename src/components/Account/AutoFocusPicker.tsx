import { Keyboard } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { ChoiceRow } from '~/components/Account/ChoiceRow';
import { useIsClient } from '~/hooks/useIsClient';
import {
  AUTOFOCUS_TARGETS,
  type AutoFocusTarget,
  getAutoFocusTarget,
  setAutoFocusTarget,
} from '~/lib/autoFocusPreference';

export const AutoFocusPicker: React.FC = () => {
  const { t } = useTranslation();
  const isClient = useIsClient();
  const [picked, setPicked] = useState<AutoFocusTarget | null>(null);
  // LocalStorage only exists after hydration.
  const current = picked ?? (isClient ? getAutoFocusTarget() : 'amount');

  return (
    <ChoiceRow
      label={t('account.autofocus')}
      icon={<Keyboard className="size-5 text-indigo-400" />}
      value={current}
      options={AUTOFOCUS_TARGETS.map((key) => ({
        key,
        label: t(`account.autofocus_targets.${key}`),
      }))}
      onPick={(key) => {
        setAutoFocusTarget(key as AutoFocusTarget);
        setPicked(key as AutoFocusTarget);
      }}
    />
  );
};
