import { Type } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { ChoiceRow } from '~/components/Account/ChoiceRow';

const STORAGE_KEY = 'cna-text-size';
const SIZES = [
  { key: 'compact', px: 14.5 },
  { key: 'normal', px: 16 },
  { key: 'large', px: 17.5 },
] as const;

type SizeKey = (typeof SIZES)[number]['key'];

export const applyStoredTextSize = () => {
  const stored = localStorage.getItem(STORAGE_KEY) as SizeKey | null;
  const size = SIZES.find((s) => s.key === stored) ?? SIZES[1];
  document.documentElement.style.fontSize = `${size.px}px`;
  return size.key;
};

export const TextSizePicker: React.FC = () => {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<SizeKey>('normal');

  useEffect(() => setCurrent(applyStoredTextSize()), []);

  return (
    <ChoiceRow
      label={t('account.text_size')}
      icon={<Type className="size-5 text-amber-500" />}
      value={current}
      options={SIZES.map(({ key }) => ({ key, label: t(`account.text_sizes.${key}`) }))}
      onPick={(key) => {
        localStorage.setItem(STORAGE_KEY, key);
        setCurrent(applyStoredTextSize());
      }}
    />
  );
};
