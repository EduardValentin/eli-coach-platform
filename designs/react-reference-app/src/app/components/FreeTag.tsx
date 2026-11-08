import type { ComponentProps } from 'react';
import { cn } from './ui/utils';

export function FreeTag({ className, ...props }: Omit<ComponentProps<'span'>, 'children'>) {
  return (
    <span
      className={cn(
        'rounded-full bg-brand-secondary px-3 py-1.5 text-label uppercase text-brand-secondary-foreground',
        className,
      )}
      {...props}
    >
      Free
    </span>
  );
}
