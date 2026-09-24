import { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './ui/utils';
import { LABEL_CLASS } from './typography';

const iconTone = cva('shrink-0', {
  variants: {
    tone: {
      neutral: 'text-text-secondary',
      primary: 'text-primary',
      'brand-secondary': 'text-brand-secondary',
      success: 'text-success',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

interface MetricTileProps extends VariantProps<typeof iconTone> {
  label: string;
  /** Smaller, de-emphasized qualifier rendered after the label, e.g. "/ session". */
  suffix?: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  /** A lucide icon element rendered without an explicit color — `tone` drives its color via `currentColor`. */
  icon: ReactNode;
}

export function MetricTile({
  label,
  suffix,
  value,
  hint,
  icon,
  tone,
}: MetricTileProps) {
  return (
    <div className="bg-card rounded-control p-4 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <span className={cn(iconTone({ tone }))} aria-hidden="true">
          {icon}
        </span>
        <span className={LABEL_CLASS}>
          {label}
          {suffix && (
            <span className="ml-1 normal-case tracking-normal font-medium text-text-secondary">
              {suffix}
            </span>
          )}
        </span>
      </div>
      <p className="text-xl font-medium tracking-tight tabular-nums text-text-primary">
        {value}
      </p>
      {hint && <p className="text-xs text-text-secondary mt-0.5">{hint}</p>}
    </div>
  );
}
