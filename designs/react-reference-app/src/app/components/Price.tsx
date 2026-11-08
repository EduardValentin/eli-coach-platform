import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './ui/utils';

const priceVariants = cva('font-semibold tabular-nums tracking-tight text-copy-muted', {
  variants: {
    size: {
      lg: 'text-2xl',
      sm: 'text-sm',
    },
  },
});

type PriceProps = ComponentProps<'p'> & Required<VariantProps<typeof priceVariants>>;

export function Price({ className, size, ...props }: PriceProps) {
  return <p className={cn(priceVariants({ size }), className)} {...props} />;
}
