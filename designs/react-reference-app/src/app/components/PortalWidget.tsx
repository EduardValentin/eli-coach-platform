import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from './ui/utils';
import { VALUE_LG_CLASS, WIDGET_TITLE_CLASS } from './typography';

export type WidgetPresentation = 'coach' | 'client';
export type WidgetDensity = 'default' | 'compact';

interface PortalWidgetProps {
  presentation: WidgetPresentation;
  title: ReactNode;
  icon?: ReactNode;
  titleAdornment?: ReactNode;
  hero?: ReactNode;
  heroUnit?: ReactNode;
  density?: WidgetDensity;
  context?: ReactNode;
  voice?: ReactNode;
  headingId: string;
  action?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
}

const PANEL_CLASS: Record<WidgetDensity, string> = {
  default:
    'flex flex-col rounded-panel border border-border/50 bg-card p-6 shadow-soft',
  compact: 'flex flex-col rounded-card border border-border/50 bg-card p-4',
};

const HEADER_CLASS: Record<WidgetDensity, string> = {
  default: 'mb-4',
  compact: 'mb-2',
};

const TITLE_CLASS: Record<WidgetDensity, string> = {
  default: WIDGET_TITLE_CLASS,
  compact: 'text-sm font-semibold text-text-primary',
};

const HERO_CLASS: Record<WidgetDensity, string> = {
  default: VALUE_LG_CLASS,
  compact: 'text-sm font-medium text-text-primary',
};

const FOOTER_CLASS: Record<WidgetDensity, string> = {
  default: 'mt-auto pt-6',
  compact: 'mt-auto pt-3',
};

const VOICE_CLASS = 'font-serif text-2xl tracking-tight text-text-primary';

export function PortalWidget({
  title,
  icon,
  titleAdornment,
  hero,
  heroUnit,
  density = 'default',
  context,
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
      className={cn(PANEL_CLASS[density], className)}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-4',
          HEADER_CLASS[density],
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <h2
            id={headingId}
            className={cn('flex items-center gap-2', TITLE_CLASS[density])}
          >
            {icon}
            {title}
          </h2>
          {titleAdornment}
        </div>
        {action && (
          <div className="-my-2 flex shrink-0 items-center">{action}</div>
        )}
      </div>

      {voice && <p className={VOICE_CLASS}>{voice}</p>}

      {hero && (
        <p className={HERO_CLASS[density]}>
          {hero}
          {heroUnit && (
            <span className="ml-1 text-sm font-medium tracking-normal text-text-secondary">
              {heroUnit}
            </span>
          )}
        </p>
      )}

      {context && <p className="mt-1 text-sm text-text-secondary">{context}</p>}

      {children}

      {footer && <div className={FOOTER_CLASS[density]}>{footer}</div>}
    </motion.section>
  );
}
