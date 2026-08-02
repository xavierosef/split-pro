import { Check } from 'lucide-react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const THRESHOLD = 72;
const MAX_PULL = 130;

type Phase = 'idle' | 'pulling' | 'refreshing' | 'done';

// En PWA plein ecran iOS il n'y a plus de rebond natif : le geste doit etre
// reimplemente. On ne prend la main que si le conteneur est deja tout en haut,
// sinon on laisse le scroll normal se faire.
// Le contenu n'est volontairement PAS translate : un ancetre transforme
// deviendrait le referentiel des enfants en position:fixed et delogerait le
// bouton d'ajout.
export const PullToRefresh: React.FC<{
  onRefresh: () => Promise<unknown>;
  children: React.ReactNode;
}> = ({ onRefresh, children }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const pull = useMotionValue(0);
  const smooth = useSpring(pull, { stiffness: 300, damping: 30 });
  const startY = useRef<number | null>(null);
  const scroller = useRef<HTMLElement | null>(null);

  const progress = useTransform(smooth, [0, THRESHOLD], [0, 1]);
  const indicatorY = useTransform(smooth, (v) => Math.min(v, MAX_PULL) * 0.55);
  const scale = useTransform(progress, [0, 1], [0.6, 1]);
  const ringDash = useTransform(progress, (v) => `${Math.min(v, 1) * 88} 88`);

  const run = useCallback(async () => {
    setPhase('refreshing');
    pull.set(THRESHOLD * 0.8);
    try {
      await onRefresh();
      setPhase('done');
      setTimeout(() => {
        setPhase('idle');
        pull.set(0);
      }, 700);
    } catch {
      setPhase('idle');
      pull.set(0);
    }
  }, [onRefresh, pull]);

  useEffect(() => {
    scroller.current = document.getElementById('mainlayout');
    const el = scroller.current;
    if (!el) {
      return;
    }

    const onStart = (e: TouchEvent) => {
      if (0 === el.scrollTop && 'idle' === phase) {
        startY.current = e.touches[0]?.clientY ?? null;
      }
    };

    const onMove = (e: TouchEvent) => {
      if (null === startY.current) {
        return;
      }
      const delta = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (0 >= delta) {
        pull.set(0);
        return;
      }
      // resistance : le geste devient de plus en plus dur
      pull.set(Math.min(MAX_PULL, delta * 0.55));
      setPhase('pulling');
    };

    const onEnd = () => {
      if (null === startY.current) {
        return;
      }
      startY.current = null;
      if (pull.get() >= THRESHOLD) {
        void run();
      } else {
        setPhase('idle');
        pull.set(0);
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [phase, pull, run]);

  return (
    <>
      <motion.div
        className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center"
        style={{ y: indicatorY }}
      >
        <AnimatePresence>
          {'idle' !== phase && (
            <motion.div
              className="liquid-glass flex size-11 items-center justify-center rounded-full"
              style={{ scale }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              {'done' === phase ? (
                <motion.span
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                >
                  <Check className="text-positive size-5" strokeWidth={3} />
                </motion.span>
              ) : (
                <motion.svg
                  viewBox="0 0 32 32"
                  className="size-7 -rotate-90"
                  animate={'refreshing' === phase ? { rotate: 360 } : undefined}
                  transition={
                    'refreshing' === phase
                      ? { duration: 0.9, repeat: Infinity, ease: 'linear' }
                      : undefined
                  }
                >
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    strokeWidth="3"
                    className="stroke-muted-foreground/25"
                  />
                  <motion.circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="oklch(0.72 0.16 205)"
                    style={{
                      strokeDasharray: 'refreshing' === phase ? '22 88' : ringDash,
                    }}
                  />
                </motion.svg>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {children}
    </>
  );
};
