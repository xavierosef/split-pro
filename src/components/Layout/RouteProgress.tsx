import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

// Les pages passent par getServerSideProps : une navigation implique un
// aller-retour serveur pendant lequel l'ecran precedent reste affiche sans rien
// dire. Cette barre est le seul retour immediat qu'on puisse donner.
export const RouteProgress: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const start = () => setLoading(true);
    const stop = () => setLoading(false);

    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', stop);
    router.events.on('routeChangeError', stop);

    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', stop);
      router.events.off('routeChangeError', stop);
    };
  }, [router.events]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5 origin-left"
          style={{
            background:
              'linear-gradient(90deg, oklch(0.72 0.16 205), oklch(0.62 0.19 255), oklch(0.58 0.21 300))',
          }}
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 0.9, transition: { duration: 1.8, ease: [0.22, 1, 0.36, 1] } }}
          exit={{ scaleX: 1, opacity: 0, transition: { duration: 0.25 } }}
        />
      )}
    </AnimatePresence>
  );
};
