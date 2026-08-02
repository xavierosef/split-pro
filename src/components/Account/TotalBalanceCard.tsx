import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { api } from '~/utils/api';

// Le solde se lit comme un niveau de liquide dans un verre : plus tu dois,
// plus ca monte. L'echelle est volontairement non lineaire — un ecart de 20 EUR
// doit se voir, un ecart de 800 ne doit pas saturer le contenant.
const REFERENCE_AMOUNT = 300;
const fillRatio = (amount: number) => 0.1 + 0.72 * (1 - Math.exp(-Math.abs(amount) / REFERENCE_AMOUNT));

const WAVE = 'M0,10 C40,0 60,20 100,10 C140,0 160,20 200,10 L200,60 L0,60 Z';

export const TotalBalanceCard: React.FC = () => {
  const { t, i18n, displayName } = useTranslationWithUtils();
  const balanceQuery = api.expense.getBalances.useQuery();

  const primary = useMemo(() => {
    const entries = (balanceQuery.data?.balances ?? []).flatMap((b) =>
      b.currencies
        .filter((c) => 0n !== c.amount)
        .map((c) => ({ friend: b.friend, currency: c.currency, amount: c.amount })),
    );
    if (!entries.length) {
      return null;
    }
    return entries.reduce((a, b) => (b.amount > a.amount || -b.amount > a.amount ? b : a));
  }, [balanceQuery.data?.balances]);

  const units = primary ? Number(primary.amount) / 100 : 0;
  const owed = 0 < units;

  const level = useSpring(0, { stiffness: 90, damping: 18, mass: 1.1 });
  const counter = useMotionValue(0);
  const smoothCounter = useSpring(counter, { stiffness: 70, damping: 20 });

  useEffect(() => {
    level.set(primary ? fillRatio(units) : 0);
    counter.set(Math.abs(units));
  }, [level, counter, units, primary]);

  const height = useTransform(level, (v) => `${Math.round(v * 100)}%`);
  const formatted = useTransform(smoothCounter, (v) =>
    new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: primary?.currency ?? 'EUR',
      maximumFractionDigits: 2,
    }).format(v),
  );

  if (!primary) {
    return (
      <div className="liquid-glass mb-6 rounded-3xl px-5 py-6 text-center">
        <p className="text-lg font-medium">{t('ui.settled_up')}</p>
      </div>
    );
  }

  const tint = owed ? 'var(--color-positive)' : 'var(--color-negative)';

  return (
    <div className="liquid-glass relative mb-6 h-40 overflow-hidden rounded-3xl">
      <motion.div className="absolute inset-x-0 bottom-0" style={{ height }}>
        <div className="absolute inset-0 top-3" style={{ background: tint, opacity: 0.55 }} />
        {[
          { duration: 7, opacity: 0.55, delay: 0 },
          { duration: 11, opacity: 0.35, delay: -3 },
        ].map((wave, i) => (
          <motion.svg
            key={i}
            className="absolute inset-x-0 top-0 h-6 w-[200%]"
            viewBox="0 0 200 60"
            preserveAspectRatio="none"
            style={{ fill: tint, opacity: wave.opacity }}
            animate={{ x: ['0%', '-50%'] }}
            transition={{
              duration: wave.duration,
              delay: wave.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <path d={WAVE} />
          </motion.svg>
        ))}
      </motion.div>

      <div className="relative flex h-full flex-col justify-center px-5">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          {owed
            ? t('ui.owes_you', { friend: displayName(primary.friend) })
            : t('ui.you_owe', { friend: displayName(primary.friend) })}
        </p>
        <motion.p
          className="mt-1 text-4xl font-semibold tabular-nums"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {formatted}
        </motion.p>
      </div>
    </div>
  );
};
