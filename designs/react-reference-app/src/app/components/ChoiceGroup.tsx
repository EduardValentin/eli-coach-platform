import {
  forwardRef,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { RadioGroup } from './ui/radio-group';
import { cn } from './ui/utils';

type ChoiceGroupProps = ComponentPropsWithoutRef<typeof RadioGroup> & {
  size?: 'sm' | 'md';
};

export const ChoiceGroup = forwardRef<
  ElementRef<typeof RadioGroup>,
  ChoiceGroupProps
>(function ChoiceGroup({ className, size = 'sm', ...props }, ref) {
  return (
    <RadioGroup
      ref={ref}
      data-size={size}
      className={cn(
        'group/choice inline-flex w-full max-w-full flex-wrap rounded-field border border-control-border-soft bg-surface-quiet/50 p-[3px] gap-1',
        className,
      )}
      loop
      orientation="horizontal"
      {...props}
    />
  );
});

type ChoiceOptionProps = ComponentProps<typeof RadioGroupPrimitive.Item>;

export function ChoiceOption({
  className,
  children,
  ...props
}: ChoiceOptionProps) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'flex min-w-fit flex-1 h-[calc(var(--size-control-sm)-6px)] group-data-[size=md]/choice:h-[calc(var(--size-control-md)-8px)] items-center justify-center rounded-[calc(var(--radius-field)-3px)] border border-transparent px-3 text-sm font-medium text-text-secondary whitespace-nowrap outline-none transition-colors hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:border-selected data-[state=checked]:bg-selected-surface data-[state=checked]:text-selected-ink data-[state=checked]:hover:border-selected-hover data-[state=checked]:hover:text-selected-hover disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </RadioGroupPrimitive.Item>
  );
}
