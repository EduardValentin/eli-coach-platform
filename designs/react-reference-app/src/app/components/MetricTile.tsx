import { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './ui/utils';

const iconTone = cva('shrink-0', {
  variants: {
    tone: {
      neutral: 'text-muted-foreground',
      brand: 'text-brand',
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

export function MetricTile({ label, suffix, value, hint, icon, tone }: MetricTileProps) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <span className={cn(iconTone({ tone }))} aria-hidden="true">{icon}</span>
        <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
          {label}
          {suffix && <span className="text-[10px] font-semibold normal-case tracking-normal"> {suffix}</span>}
        </span>
      </div>
      <p className="text-xl font-serif font-bold text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
