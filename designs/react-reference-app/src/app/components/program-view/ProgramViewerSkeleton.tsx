import { cardVariants } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../ui/utils';

const PULSE_CLASS = 'motion-reduce:animate-none';
const DAYS = 7;
const EXERCISES = 3;

export function ProgramViewerSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading program" className="grid grid-cols-1 gap-3">
      <div className={cn(cardVariants({ variant: 'panel' }), 'grid gap-4 p-4')}>
        <Skeleton className={cn(PULSE_CLASS, 'h-6 w-2/5')} />
        <Skeleton className={cn(PULSE_CLASS, 'h-4 w-3/5')} />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: DAYS }, (_, day) => (
            <Skeleton key={day} className={cn(PULSE_CLASS, 'h-16')} />
          ))}
        </div>
      </div>
      <div className={cn(cardVariants({ variant: 'panel' }), 'grid gap-4 p-4')}>
        <Skeleton className={cn(PULSE_CLASS, 'h-4 w-1/3')} />
        <Skeleton className={cn(PULSE_CLASS, 'h-8 w-1/2')} />
        {Array.from({ length: EXERCISES }, (_, exercise) => (
          <div key={exercise} className="grid gap-2 border-t border-border-subtle pt-4">
            <Skeleton className={cn(PULSE_CLASS, 'h-5 w-1/2')} />
            <Skeleton className={cn(PULSE_CLASS, 'h-10')} />
            <Skeleton className={cn(PULSE_CLASS, 'h-10')} />
            <Skeleton className={cn(PULSE_CLASS, 'h-10')} />
          </div>
        ))}
      </div>
      <p role="status" className="sr-only">
        Loading program
      </p>
    </section>
  );
}
