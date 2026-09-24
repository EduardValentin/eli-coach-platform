import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SectionEyebrow } from './SectionEyebrow';
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

const COACH_PANEL_CLASS =
  'rounded-panel border border-border/50 bg-card p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)]';

const CLIENT_PANEL_CLASS =
  'rounded-panel border border-border/50 bg-card p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] sm:p-8';

const CLIENT_HERO_CLASS: Record<WidgetHeroSize, string> = {
  default:
    'font-semibold text-2xl tracking-tight text-text-primary lg:text-3xl',
  compact: 'text-base font-semibold text-text-primary sm:text-lg',
};

const CLIENT_VOICE_CLASS =
  'font-serif text-2xl tracking-tight text-text-primary lg:text-3xl';

const COACH_HERO_CLASS = 'text-base font-semibold text-text-primary';

const COACH_VOICE_CLASS = 'font-serif text-lg text-text-primary';

export function PortalWidget({
  presentation,
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
  const isCoach = presentation === 'coach';

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby={headingId}
      className={cn(
        isCoach ? COACH_PANEL_CLASS : CLIENT_PANEL_CLASS,
        className,
      )}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
    >
      {isCoach ? (
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2
            id={headingId}
            className="flex items-center gap-2 font-serif text-lg font-semibold text-text-primary"
          >
            {icon}
            {title}
          </h2>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <SectionEyebrow as="h2" className="mb-2" id={headingId}>
            {title}
          </SectionEyebrow>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {voice && (
        <p className={isCoach ? COACH_VOICE_CLASS : CLIENT_VOICE_CLASS}>
          {voice}
        </p>
      )}

      {hero && (
        <p className={isCoach ? COACH_HERO_CLASS : CLIENT_HERO_CLASS[heroSize]}>
          {hero}
        </p>
      )}

      {children}

      {footer && <div className="mt-6">{footer}</div>}
    </motion.section>
  );
}
