import * as React from "react";
import { RadioGroup as RadixRadioGroup } from "radix-ui";

import { cn } from "../lib/cn";
import { RadioGroup } from "./radio-group";

type ChoiceGroupProps = React.ComponentPropsWithoutRef<typeof RadioGroup>;

type ChoiceOptionProps = React.ComponentPropsWithoutRef<
  typeof RadixRadioGroup.Item
>;

export const ChoiceGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroup>,
  ChoiceGroupProps
>(({ className, ...props }, ref) => (
  <RadioGroup
    className={cn(
      "inline-flex w-full max-w-full flex-wrap gap-1 rounded-field border border-control-border-soft bg-surface-quiet/50 p-[3px]",
      className,
    )}
    loop
    orientation="horizontal"
    ref={ref}
    {...props}
  />
));

ChoiceGroup.displayName = "ChoiceGroup";

export const ChoiceOption = React.forwardRef<
  React.ElementRef<typeof RadixRadioGroup.Item>,
  ChoiceOptionProps
>(({ className, ...props }, ref) => (
  <RadixRadioGroup.Item
    className={cn(
      "flex h-[calc(var(--size-control-sm)-6px)] min-w-fit flex-1 items-center justify-center whitespace-nowrap rounded-[calc(var(--radius-field)-3px)] px-3 text-sm font-semibold text-text-secondary outline-none transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:hover:text-primary-foreground",
      className,
    )}
    ref={ref}
    {...props}
  />
));

ChoiceOption.displayName = "ChoiceOption";
