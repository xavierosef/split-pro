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
// Chaque calque couvre TOUTE la hauteur du liquide et remplit jusqu'en bas :
// c'est ce qui evite les bandes horizontales visibles la ou un calque
// s'arretait. Seule la crete varie. Amplitude large et cretes irregulieres
// pour que ca ne ressemble pas a une sinusoide.
const WAVES = [
  {
    d: 'M0,30 C10,8 20,4 32,18 C44,32 54,44 66,30 C78,16 88,2 100,14 C112,26 122,42 134,32 C146,22 156,4 168,16 C180,28 190,34 200,24 L200,200 L0,200 Z',
    duration: 4,
    opacity: 0.55,
  },
  {
    d: 'M0,20 C12,42 24,38 36,20 C48,2 58,6 70,26 C82,46 94,40 106,22 C118,4 130,8 142,28 C154,48 166,42 178,24 C188,10 195,16 200,22 L200,200 L0,200 Z',
    duration: 6.5,
    opacity: 0.4,
  },
  {
    d: 'M0,38 C14,20 26,50 40,36 C56,20 68,52 84,38 C100,24 112,54 128,40 C144,26 158,50 172,38 C184,28 194,42 200,36 L200,200 L0,200 Z',
    duration: 10,
    opacity: 0.3,
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
      <div className="liquid-glass mb-5 rounded-3xl px-5 py-4 text-center">
        <p className="text-lg font-medium">{t('ui.settled_up')}</p>
      </div>
    );
  }

  const tint = owed ? 'var(--color-positive)' : 'var(--color-negative)';

  return (
    <div className="liquid-glass relative mb-5 h-26 overflow-hidden rounded-3xl">
      <motion.div
        className="absolute -inset-x-4 -bottom-3"
        style={{ height }}
        animate={{ y: [0, -5, 2, -3, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, ${tint} 0%, ${tint} 100%)`,
            opacity: 0.5,
          }}
        />
        {WAVES.map((wave, i) => (
          <motion.svg
            key={i}
            className="absolute inset-0 h-full w-[200%]"
            viewBox="0 0 200 200"
            preserveAspectRatio="none"
            style={{ fill: tint, opacity: wave.opacity }}
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: wave.duration, repeat: Infinity, ease: 'linear' }}
          >
            <path d={wave.d} />
          </motion.svg>
        ))}
      </motion.div>

      <div className="relative flex h-full flex-col justify-center gap-0.5 px-5">
        <p className="text-foreground/90 text-sm font-medium tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
          {owed
            ? t('ui.owes_you', { friend: displayName(primary.friend) })
            : t('ui.you_owe', { friend: displayName(primary.friend) })}
        </p>
        <motion.p
          className="text-3xl font-semibold tabular-nums drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
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
