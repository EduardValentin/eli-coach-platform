import { motion } from 'motion/react';
import { useWaitlistSpots } from '../../services/waitlistService';

type SpotCounterProps = {
  variant?: 'dark' | 'light';
};

export function SpotCounter({ variant = 'dark' }: SpotCounterProps) {
  const spots = useWaitlistSpots();
  const filled = ((50 - spots) / 50) * 100;
  const isUrgent = spots > 0 && spots < 10;
  const isFull = spots <= 0;

  const textColor =
    variant === 'dark'
      ? isUrgent
        ? 'text-[#FF4D6D]'
        : 'text-white/70'
      : isUrgent
        ? 'text-[#FF4D6D]'
        : 'text-neutral-500';

  const barBg = variant === 'dark' ? 'bg-white/10' : 'bg-neutral-200';

  const label = isFull
    ? 'All spots have been claimed'
    : isUrgent
      ? `Only ${spots} spots left`
      : `${spots} of 50 spots remaining`;

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
