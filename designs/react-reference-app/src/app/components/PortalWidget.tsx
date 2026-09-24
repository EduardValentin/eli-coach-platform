import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from './ui/utils';

export type WidgetPresentation = 'coach' | 'client';
export type WidgetHeroSize = 'default' | 'compact';

interface PortalWidgetProps {
  presentation: WidgetPresentation;
  title: ReactNode;
  icon?: ReactNode;
  hero?: ReactNode;
  heroSize?: WidgetHeroSize;
  voice?: ReactNode;
  headingId: string;
  action?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
}

const PANEL_CLASS =
  'rounded-panel border border-border/50 bg-card p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)]';

const HERO_CLASS: Record<WidgetHeroSize, string> = {
  default: 'text-2xl font-semibold tracking-tight text-text-primary',
  compact: 'text-base font-semibold text-text-primary sm:text-lg',
};

const VOICE_CLASS = 'font-serif text-2xl tracking-tight text-text-primary';

export function PortalWidget({
  title,
  icon,
  hero,
  heroSize = 'default',
  voice,
  headingId,
  action,
  footer,
  className,
  children,
}: PortalWidgetProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby={headingId}
      className={cn(PANEL_CLASS, className)}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2
          id={headingId}
          className="flex items-center gap-2 text-base font-semibold text-text-primary"
        >
          {icon}
          {title}
        </h2>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {voice && <p className={VOICE_CLASS}>{voice}</p>}

      {hero && <p className={HERO_CLASS[heroSize]}>{hero}</p>}

      {children}

      {footer && <div className="mt-6">{footer}</div>}
    </motion.section>
  );
}
