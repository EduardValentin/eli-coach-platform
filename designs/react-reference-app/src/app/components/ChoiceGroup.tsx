import { type ComponentProps } from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { RadioGroup } from './ui/radio-group';
import { cn } from './ui/utils';

type ChoiceGroupProps = ComponentProps<typeof RadioGroup>;

export function ChoiceGroup({ className, ...props }: ChoiceGroupProps) {
  return (
    <RadioGroup
      className={cn(
        'inline-flex w-full max-w-full flex-wrap rounded-field border border-control-border-soft bg-surface-quiet/50 p-[3px] gap-1',
        className,
      )}
      loop
      orientation="horizontal"
      {...props}
    />
  );
}

type ChoiceOptionProps = ComponentProps<typeof RadioGroupPrimitive.Item>;

export function ChoiceOption({
  className,
  children,
  ...props
}: ChoiceOptionProps) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'flex min-w-fit flex-1 h-[calc(var(--size-control-sm)-6px)] items-center justify-center rounded-[calc(var(--radius-field)-3px)] px-3 text-sm font-semibold text-text-secondary whitespace-nowrap outline-none transition-colors hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:bg-active-surface data-[state=checked]:text-primary-foreground data-[state=checked]:hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </RadioGroupPrimitive.Item>
  );
}
