import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from './ui/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-field transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary:
          'bg-brand-secondary text-brand-secondary-foreground hover:bg-brand-secondary-hover',
        inverted:
          'bg-surface-inverted text-surface-inverted-foreground hover:bg-primary',
        outline:
          'border border-control-border-soft bg-surface-base text-text-label hover:bg-surface-quiet hover:text-text-primary',
        'outline-brand': 'border border-primary text-primary hover:bg-primary/5',
        glass:
          'border border-surface-inverted-foreground/30 bg-surface-inverted-foreground/15 text-surface-inverted-foreground backdrop-blur-sm hover:bg-surface-inverted-foreground/25',
      },
      size: {
        xs: 'h-(--size-control-xs) px-3 text-sm has-[>svg]:px-2.5',
        md: 'h-(--size-control-md) px-6 text-base has-[>svg]:px-5',
        lg: 'h-(--size-control-lg) px-8 text-base',
        'lg-tight': 'h-(--size-control-lg) px-4 text-base',
      },
      width: {
        content: '',
        full: 'w-full shrink',
        'full-below-sm': 'w-full sm:w-auto',
      },
      weight: {
        regular: 'font-normal',
        medium: 'font-medium',
        semibold: 'font-semibold',
      },
      textSize: {
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
      },
      lettering: {
        plain: '',
        wide: 'tracking-wide',
        caps: 'uppercase tracking-widest',
      },
      elevation: {
        flat: '',
        raised: 'shadow-action transition-all hover:shadow-action-hover',
      },
      press: {
        none: '',
        scale: 'transition-all active:scale-[0.98]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      width: 'content',
      weight: 'medium',
      lettering: 'plain',
      elevation: 'flat',
      press: 'none',
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

function themeButtonVariants(options?: ButtonVariantProps): string {
  return cn(buttonVariants(options));
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariantProps;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      elevation,
      lettering,
      press,
      size,
      textSize,
      variant,
      weight,
      width,
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        buttonVariants({
          elevation,
          lettering,
          press,
          size,
          textSize,
          variant,
          weight,
          width,
        }),
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { Button, cn, themeButtonVariants as buttonVariants };
