import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from './ui/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground not-aria-disabled:hover:bg-primary-hover',
        secondary:
          'bg-brand-secondary text-brand-secondary-foreground not-aria-disabled:hover:bg-brand-secondary-hover',
        inverted:
          'bg-surface-inverted text-surface-inverted-foreground not-aria-disabled:hover:bg-primary',
        outline:
          'border border-control-border-soft bg-surface-base text-text-label not-aria-disabled:hover:bg-surface-quiet not-aria-disabled:hover:text-text-primary',
        'outline-brand': 'border border-primary text-primary not-aria-disabled:hover:bg-primary/5',
        glass:
          'border border-surface-inverted-foreground/30 bg-surface-inverted-foreground/15 text-surface-inverted-foreground backdrop-blur-sm not-aria-disabled:hover:bg-surface-inverted-foreground/25',
        ink: 'bg-foreground text-background not-aria-disabled:hover:bg-brand',
        'on-brand': 'bg-card text-brand not-aria-disabled:hover:bg-surface-subtle',
      },
      corner: {
        field: 'rounded-field',
        control: 'rounded-control',
      },
      size: {
        xs: 'h-(--size-control-xs) px-3 text-sm has-[>svg]:px-2.5',
        md: 'h-(--size-control-md) px-6 text-base has-[>svg]:px-5',
        'md-wide': 'h-(--size-control-md) px-6 text-base',
        'md-grow': 'min-h-(--size-control-md) px-5 text-base whitespace-normal',
        lg: 'h-(--size-control-lg) px-8 text-base',
        'lg-tight': 'h-(--size-control-lg) px-4 text-base',
        xl: 'h-(--size-control-xl) px-12 text-lg',
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
        card: 'shadow-card',
        raised: 'shadow-action transition-all not-aria-disabled:hover:shadow-action-hover',
      },
      press: {
        none: '',
        scale: 'transition-all motion-safe:not-aria-disabled:active:scale-[0.98]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      corner: 'field',
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
      corner,
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
          corner,
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
