import { Type } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { ChoiceRow } from '~/components/Account/ChoiceRow';
import { useIsClient } from '~/hooks/useIsClient';

const STORAGE_KEY = 'cna-text-size';
const SIZES = [
  { key: 'compact', px: 14.5 },
  { key: 'normal', px: 16 },
  { key: 'large', px: 17.5 },
] as const;

type SizeKey = (typeof SIZES)[number]['key'];

const storedTextSize = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return SIZES.find((s) => s.key === stored) ?? SIZES[1];
};

export const applyStoredTextSize = () => {
  const size = storedTextSize();
  document.documentElement.style.fontSize = `${size.px}px`;
  return size.key;
};

export const TextSizePicker: React.FC = () => {
  const { t } = useTranslation();
  const isClient = useIsClient();
  const [picked, setPicked] = useState<SizeKey | null>(null);
  // LocalStorage only exists after hydration; _app applies the stored size on mount.
  const current = picked ?? (isClient ? storedTextSize().key : 'normal');

  return (
    <ChoiceRow
      label={t('account.text_size')}
      icon={<Type className="size-5 text-amber-500" />}
      value={current}
      options={SIZES.map(({ key }) => ({ key, label: t(`account.text_sizes.${key}`) }))}
      onPick={(key) => {
        localStorage.setItem(STORAGE_KEY, key);
        setPicked(applyStoredTextSize());
      }}
    />
  );
};
