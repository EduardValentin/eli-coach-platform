import type { ComponentProps, ReactNode } from 'react';
import { Check, ShoppingBag } from 'lucide-react';
import { cardVariants } from './ui/card';
import { cn } from './ui/utils';

type ConfirmationOutcome = 'confirmed' | 'not-completed';

const OUTCOME_BADGES: Record<ConfirmationOutcome, { icon: ReactNode; className: string }> = {
  confirmed: {
    icon: <Check aria-hidden="true" size={28} />,
    className: 'bg-success-surface text-success',
  },
  'not-completed': {
    icon: <ShoppingBag aria-hidden="true" size={26} />,
    className: 'bg-brand-secondary-soft text-brand-secondary',
  },
};

export function ConfirmationPage(props: { landmarkLabel: string; parityRoot: string; children: ReactNode }) {
  return (
    <main
      aria-label={props.landmarkLabel}
      className="min-h-screen bg-surface-page px-4 py-16 sm:px-6"
      data-parity-root={props.parityRoot}
    >
      <div className={cn(cardVariants({ variant: 'panel' }), 'mx-auto w-full max-w-xl px-6 py-10 sm:px-10')}>
        {props.children}
      </div>
    </main>
  );
}

export function ConfirmationHeading(props: { outcome: ConfirmationOutcome; children: ReactNode }) {
  const badge = OUTCOME_BADGES[props.outcome];

  return (
    <>
      <span className={cn('mx-auto flex size-14 items-center justify-center rounded-full', badge.className)}>
        {badge.icon}
      </span>

      <h1 className="mt-6 text-center font-serif text-display-sm text-text-primary">{props.children}</h1>
    </>
  );
}

export function ConfirmationLead({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('mt-4 text-center text-base leading-relaxed text-text-secondary', className)} {...props} />;
}

export function ConfirmationReadings({ className, ...props }: ComponentProps<'dl'>) {
  return (
    <dl
      className={cn(
        'grid gap-3 rounded-card border border-border-subtle bg-surface-quiet px-5 py-4 text-sm',
        className,
      )}
      {...props}
    />
  );
}

export function ConfirmationActions({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mt-8 flex justify-center', className)} {...props} />;
}

function readingParityHook(term: string): string {
  return `reading-${term.toLowerCase().replace(/\s+/g, '-')}`;
}

export function ConfirmationReading({ term, value }: { term: string; value: string }) {
  return (
    <div
      className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
      data-parity={readingParityHook(term)}
    >
      <dt className="text-text-secondary">{term}</dt>
      <dd className="font-medium text-text-primary sm:text-right">{value}</dd>
    </div>
  );
}
