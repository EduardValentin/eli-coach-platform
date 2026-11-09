import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './ui/utils';

const freeTagVariants = cva('rounded-full bg-brand-secondary uppercase text-brand-secondary-foreground', {
  variants: {
    size: {
      default: 'px-3 py-1.5 text-label',
      sm: 'px-2 py-0.5 text-caption leading-4 font-semibold tracking-label',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

type FreeTagProps = Omit<ComponentProps<'span'>, 'children'> & VariantProps<typeof freeTagVariants>;

export function FreeTag({ className, size, ...props }: FreeTagProps) {
  return (
    <span className={cn(freeTagVariants({ size }), className)} {...props}>
      Free
    </span>
  );
}
