import type { ComponentProps } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from './ui/utils';

export function InlineProblem({
  className,
  children,
  ...rest
}: ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 text-sm leading-snug text-destructive',
        className,
      )}
      {...rest}
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
      {children}
    </p>
  );
}
