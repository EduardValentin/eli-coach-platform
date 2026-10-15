import * as React from 'react';
import { Checkbox } from './ui/checkbox';
import { cardVariants } from './ui/card';
import { RequiredMark } from './ui/label';
import { cn } from './ui/utils';
import { FIELD_ERROR_CLASS } from '../utils/formFieldStyles';

type CheckboxFieldLayout = 'inline' | 'statement';

type CheckboxFieldFrame = 'none' | 'inset';

type CheckboxFieldProps = Omit<React.ComponentPropsWithoutRef<'div'>, 'onChange'> & {
  checkboxParity?: string;
  checkboxRef?: React.Ref<HTMLButtonElement>;
  checked: boolean;
  disabled?: boolean;
  error?: string;
  errorParity?: string;
  errorRole?: 'alert';
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
      errorRole,
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
        {error && (
          <p className={FIELD_ERROR_CLASS} data-parity={errorParity} id={errorId} role={errorRole}>
            {error}
          </p>
        )}
      </div>
    );
  },
);

CheckboxField.displayName = 'CheckboxField';
