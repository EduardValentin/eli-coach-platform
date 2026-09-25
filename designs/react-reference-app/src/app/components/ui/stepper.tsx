import type { ReactNode } from 'react';
import { cn } from './utils';

type StepperProps = {
  current: number;
  total: number;
  className?: string;
  status?: ReactNode;
};

function barClass(index: number, current: number): string {
  if (index < current) return 'bg-primary/40';
  if (index === current) return 'bg-primary';

  return 'bg-surface-muted';
}

export function Stepper({ current, total, className, status }: StepperProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-end justify-between gap-4">
        <p className="text-caption font-semibold uppercase tracking-widest text-text-secondary">
          Step {current} of {total}
        </p>
        {status}
      </div>
      <div aria-hidden="true" className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              barClass(index + 1, current),
            )}
          />
        ))}
      </div>
    </div>
  );
}
