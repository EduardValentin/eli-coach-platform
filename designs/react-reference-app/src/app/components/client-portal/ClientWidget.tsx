import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SectionEyebrow } from '../SectionEyebrow';
import { cn } from '../ui/utils';

interface ClientWidgetProps {
  eyebrow: ReactNode;
  hero?: ReactNode;
  headingId: string;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function ClientWidget({
  eyebrow,
  hero,
  headingId,
  children,
  className,
  action,
}: ClientWidgetProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby={headingId}
      className={cn(
        'rounded-panel border border-border/50 bg-card p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] sm:p-8',
        className,
      )}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
    >
      <div className="flex items-start justify-between gap-4">
        <SectionEyebrow as="h2" className="mb-2" id={headingId}>
          {eyebrow}
        </SectionEyebrow>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {hero && (
        <p className="font-serif text-2xl tracking-tight text-text-primary lg:text-3xl">
          {hero}
        </p>
      )}

      {children}
    </motion.section>
  );
}
