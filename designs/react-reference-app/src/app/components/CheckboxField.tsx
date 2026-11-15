import * as React from 'react';
import { Checkbox } from './ui/checkbox';
import { cardVariants } from './ui/card';
import { RequiredMark } from './ui/label';
import { cn } from './ui/utils';
import { FieldError } from './FieldError';

type CheckboxFieldLayout = 'inline' | 'statement';

type CheckboxFieldFrame = 'none' | 'inset';

type CheckboxFieldProps = Omit<React.ComponentPropsWithoutRef<'div'>, 'onChange'> & {
  checkboxParity?: string;
  checkboxRef?: React.Ref<HTMLButtonElement>;
  checked: boolean;
  disabled?: boolean;
  error?: string;
  errorParity?: string;
  frame?: CheckboxFieldFrame;
  label: React.ReactNode;
  layout?: CheckboxFieldLayout;
  onCheckedChange: (checked: boolean) => void;
  required?: boolean;
};

export const CheckboxField = React.forwardRef<HTMLDivElement, CheckboxFieldProps>(
  (
    {
      checkboxParity,
      checkboxRef,
      checked,
      children,
      className,
      disabled,
      error,
      errorParity,
      frame = 'none',
      label,
      layout = 'inline',
      onCheckedChange,
      required,
      ...props
    },
    ref,
  ) => {
    const checkboxId = React.useId();
    const errorId = React.useId();
    const isStatement = layout === 'statement';
    const invalid = error !== undefined;

    return (
      <div className={cn('grid gap-2', className)} ref={ref} {...props}>
        <div
          className={cn('flex', {
            'items-start gap-3': isStatement,
            'items-center gap-2': !isStatement,
            [cardVariants({ variant: 'inset' })]: frame === 'inset',
          })}
        >
          <Checkbox
            aria-describedby={invalid ? errorId : undefined}
            aria-invalid={invalid}
            checked={checked}
            className={cn({ 'mt-0.5': isStatement })}
            data-parity={checkboxParity}
            disabled={disabled}
            id={checkboxId}
            onCheckedChange={(next) => onCheckedChange(next === true)}
            ref={checkboxRef}
          />
          <label
            className={cn('text-sm text-text-primary', {
              'leading-relaxed': isStatement,
            })}
            htmlFor={checkboxId}
          >
            {label}
            {required && <RequiredMark />}
          </label>
        </div>
        {children}
        <FieldError data-parity={errorParity} id={errorId} message={error} />
      </div>
    );
  },
);

CheckboxField.displayName = 'CheckboxField';
