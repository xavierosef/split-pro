import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { api } from '~/utils/api';

// Le solde se lit comme un niveau de liquide dans un verre : plus tu dois,
// plus ca monte. L'echelle est volontairement non lineaire — un ecart de 20 EUR
// doit se voir, un ecart de 800 ne doit pas saturer le contenant.
const REFERENCE_AMOUNT = 300;
const fillRatio = (amount: number) => 0.1 + 0.72 * (1 - Math.exp(-Math.abs(amount) / REFERENCE_AMOUNT));

// Trois profils de vague differents : superposes a des vitesses et des
// amplitudes distinctes, ils ne se resynchronisent jamais, ce qui donne
// l'impression d'un liquide reellement agite plutot que d'une boucle.
const WAVES = [
  {
    d: 'M0,26 C12,6 26,4 38,20 C50,36 62,38 74,22 C86,6 100,2 112,18 C124,34 138,36 150,20 C162,4 176,6 188,22 C194,30 198,28 200,24 L200,90 L0,90 Z',
    duration: 4.5,
    opacity: 0.65,
    height: 'h-10',
  },
  {
    d: 'M0,18 C16,34 30,32 44,16 C58,0 72,2 86,20 C100,38 116,36 130,18 C144,0 158,4 172,20 C184,32 194,28 200,20 L200,90 L0,90 Z',
    duration: 7,
    opacity: 0.45,
    height: 'h-13',
  },
  {
    d: 'M0,30 C14,14 28,38 44,28 C62,16 76,34 92,26 C110,16 124,38 142,28 C158,18 174,32 190,24 C195,22 198,26 200,28 L200,90 L0,90 Z',
    duration: 11,
    opacity: 0.3,
    height: 'h-16',
  },
];

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
      <motion.div
        className="absolute inset-x-0 bottom-0"
        style={{ height }}
        animate={{ y: [0, -5, 2, -3, 0], rotate: [0, 0.5, -0.4, 0.3, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 top-4" style={{ background: tint, opacity: 0.5 }} />
        {WAVES.map((wave, i) => (
          <motion.svg
            key={i}
            className={`absolute inset-x-0 top-0 w-[200%] ${wave.height}`}
            viewBox="0 0 200 90"
            preserveAspectRatio="none"
            style={{ fill: tint, opacity: wave.opacity }}
            animate={{ x: ['0%', '-50%'], scaleY: [1, 1.35, 0.85, 1.2, 1] }}
            transition={{
              x: { duration: wave.duration, repeat: Infinity, ease: 'linear' },
              scaleY: {
                duration: wave.duration * 0.8,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
          >
            <path d={wave.d} />
          </motion.svg>
        ))}
      </motion.div>

      <div className="relative flex h-full flex-col justify-center px-5">
        <p className="text-foreground/90 text-sm font-medium tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
          {owed
            ? t('ui.owes_you', { friend: displayName(primary.friend) })
            : t('ui.you_owe', { friend: displayName(primary.friend) })}
        </p>
        <motion.p
          className="mt-1 text-4xl font-semibold tabular-nums drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
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
