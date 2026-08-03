import { motion } from 'motion/react';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
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

  const pick = (target: AutoFocusTarget) => {
    setAutoFocusTarget(target);
    setCurrent(target);
  };

  return (
    <div>
      <p className="text-muted-foreground mb-2 text-sm">{t('account.autofocus')}</p>
      <div className="bg-muted flex gap-1 rounded-full p-1">
        {AUTOFOCUS_TARGETS.map((target) => (
          <button
            key={target}
            type="button"
            onClick={() => pick(target)}
            aria-pressed={current === target}
            className="relative flex-1 rounded-full py-2 text-sm"
          >
            {current === target && (
              <motion.span
                layoutId="autofocus-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="bg-background absolute inset-0 rounded-full shadow-sm"
              />
            )}
            <span className="relative z-10">{t(`account.autofocus_targets.${target}`)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
