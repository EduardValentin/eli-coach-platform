import { motion } from 'motion/react';
import { MAX_SPOTS, useWaitlistSpots } from '../../services/waitlistService';

type SpotCounterProps = {
  variant?: 'dark' | 'light';
};

export function SpotCounter({ variant = 'dark' }: SpotCounterProps) {
  const spots = useWaitlistSpots();
  const filled = ((MAX_SPOTS - spots) / MAX_SPOTS) * 100;
  const isFull = spots <= 0;

  const textColor =
    variant === 'dark'
      ? 'text-white/70'
      : 'text-neutral-500';

  const barBg = variant === 'dark' ? 'bg-white/10' : 'bg-neutral-200';

  const label = isFull
    ? 'All spots have been claimed'
    : `${spots} of ${MAX_SPOTS} spots remaining`;

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className={`flex items-center justify-center gap-2 text-sm font-medium tracking-wide mb-2 ${textColor}`}>
        <motion.span
          key={spots}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {label}
        </motion.span>
      </div>

      <div className={`h-1 rounded-full overflow-hidden ${barBg}`}>
        <motion.div
          className="h-full rounded-full bg-[#C81D6B]"
          initial={{ width: 0 }}
          animate={{ width: `${filled}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
