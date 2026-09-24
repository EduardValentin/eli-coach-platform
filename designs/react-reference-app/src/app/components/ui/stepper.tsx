import { cn } from './utils';

type StepperProps = {
  current: number;
  total: number;
  className?: string;
};

function barClass(index: number, current: number): string {
  if (index < current) return 'bg-primary/40';
  if (index === current) return 'bg-primary';

  return 'bg-surface-muted';
}

export function Stepper({ current, total, className }: StepperProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="text-caption font-semibold uppercase tracking-widest text-text-secondary">
        Step {current} of {total}
      </p>
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
