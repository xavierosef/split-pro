import { Keyboard } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { ChoiceRow } from '~/components/Account/ChoiceRow';
import {
  AUTOFOCUS_TARGETS,
  type AutoFocusTarget,
  getAutoFocusTarget,
  setAutoFocusTarget,
} from '~/lib/autoFocusPreference';

export const AutoFocusPicker: React.FC = () => {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<AutoFocusTarget>('amount');

  useEffect(() => setCurrent(getAutoFocusTarget()), []);

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
        setCurrent(key as AutoFocusTarget);
      }}
    />
  );
};
