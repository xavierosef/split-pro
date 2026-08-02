import { PlusIcon } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

const MotionLink = motion.create(Link);

export const AddExpenseFab: React.FC<{ groupId: number; label: string }> = ({ groupId, label }) => (
  <MotionLink
    href={`/add?groupId=${groupId}`}
    aria-label={label}
    className="liquid-glass liquid-glass--accent fixed right-5 bottom-[calc(env(safe-area-inset-bottom)+7.75rem)] z-50 flex size-15 items-center justify-center rounded-full lg:bottom-8"
    initial={{ scale: 0, rotate: -90 }}
    animate={{ scale: 1, rotate: 0 }}
    whileTap={{ scale: 0.88 }}
    transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.15 }}
  >
    <PlusIcon className="size-7 text-white drop-shadow-sm" strokeWidth={2.75} />
  </MotionLink>
);
