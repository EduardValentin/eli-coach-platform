import type { ElementType, HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './ui/utils';

const eyebrowVariants = cva('uppercase tracking-section-eyebrow font-sans', {
  variants: {
    variant: {
      brand: 'text-brand text-xs md:text-sm font-semibold mb-4',
      muted: 'text-muted-foreground text-sm mb-6',
    },
  },
  defaultVariants: { variant: 'brand' },
});

interface SectionEyebrowProps
  extends HTMLAttributes<HTMLElement>, VariantProps<typeof eyebrowVariants> {
  as?: ElementType;
}

export function SectionEyebrow({
  as: Component = 'p',
  variant,
  className,
  children,
  ...props
}: SectionEyebrowProps) {
  return (
    <Component
      className={cn(eyebrowVariants({ variant }), className)}
      {...props}
    >
      {children}
    </Component>
  );
}
