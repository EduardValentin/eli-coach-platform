import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from './ui/utils';

export function TablePanel({
  className,
  parity,
  children,
}: {
  className?: string;
  parity?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50 overflow-hidden',
        className,
      )}
      data-parity={parity}
    >
      {children}
    </motion.div>
  );
}
