import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './ui/utils';

const eyebrowVariants = cva('uppercase tracking-[0.2em] font-sans', {
  variants: {
    variant: {
      brand: 'text-brand text-xs md:text-sm font-semibold mb-4',
      muted: 'text-muted-foreground text-sm mb-6',
    },
  },
  defaultVariants: { variant: 'brand' },
});

interface SectionEyebrowProps
  extends HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof eyebrowVariants> {}

export function SectionEyebrow({
  variant,
  className,
  children,
  ...props
}: SectionEyebrowProps) {
  return (
    <p className={cn(eyebrowVariants({ variant }), className)} {...props}>
      {children}
    </p>
  );
}
