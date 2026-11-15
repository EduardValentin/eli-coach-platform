import type { ComponentPropsWithoutRef } from 'react';
import { FIELD_ERROR_CLASS } from '../utils/formFieldStyles';
import { cn } from './ui/utils';

type FieldErrorProps = Omit<ComponentPropsWithoutRef<'p'>, 'children'> & {
  id: string;
  message: string | null | undefined;
};

export function FieldError({ message, className, ...props }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p className={cn(FIELD_ERROR_CLASS, className)} role="alert" {...props}>
      {message}
    </p>
  );
}
