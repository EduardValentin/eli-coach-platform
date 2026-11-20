import type { ComponentProps } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from './utils';

/** The one way a field or action states what is wrong: an alert icon beside the message, in the destructive ink. */
export function InlineProblem({ className, children, ...rest }: ComponentProps<'p'>) {
  return (
    <p data-slot="inline-problem" className={cn('flex items-start gap-1.5 text-sm leading-snug font-medium text-destructive', className)} {...rest}>
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}
