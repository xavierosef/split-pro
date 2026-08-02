import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';

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

  const pick = (key: SizeKey) => {
    localStorage.setItem(STORAGE_KEY, key);
    setCurrent(applyStoredTextSize());
  };

  return (
    <div>
      <p className="text-muted-foreground mb-2 text-sm">{t('account.text_size')}</p>
      <div className="bg-muted flex gap-1 rounded-full p-1">
        {SIZES.map(({ key, px }) => (
          <button
            key={key}
            type="button"
            onClick={() => pick(key)}
            aria-pressed={current === key}
            className="relative flex-1 rounded-full py-2"
          >
            {current === key && (
              <motion.span
                layoutId="text-size-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="bg-background absolute inset-0 rounded-full shadow-sm"
              />
            )}
            <span
              className="relative z-10"
              style={{ fontSize: `${px * 0.82}px` }}
            >
              {t(`account.text_sizes.${key}`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
