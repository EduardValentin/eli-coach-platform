import * as React from "react";
import { RadioGroup as RadixRadioGroup } from "radix-ui";

import { cn } from "../lib/cn";
import type { FieldSize } from "./field-size";
import { RadioGroup } from "./radio-group";

type ChoiceGroupProps = React.ComponentPropsWithoutRef<typeof RadioGroup> & {
  size?: FieldSize;
};

type ChoiceOptionProps = React.ComponentPropsWithoutRef<
  typeof RadixRadioGroup.Item
>;

const ChoiceGroupSize = React.createContext<FieldSize>("sm");

export const ChoiceGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroup>,
  ChoiceGroupProps
>(({ className, size = "sm", ...props }, ref) => (
  <ChoiceGroupSize.Provider value={size}>
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
  </ChoiceGroupSize.Provider>
));

ChoiceGroup.displayName = "ChoiceGroup";

export const ChoiceOption = React.forwardRef<
  React.ElementRef<typeof RadixRadioGroup.Item>,
  ChoiceOptionProps
>(({ className, ...props }, ref) => {
  const size = React.useContext(ChoiceGroupSize);

  return (
    <RadixRadioGroup.Item
      className={cn(
        "flex min-w-fit flex-1 items-center justify-center whitespace-nowrap rounded-[calc(var(--radius-field)-3px)] px-3 text-sm font-semibold text-text-secondary outline-none transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:hover:text-primary-foreground",
        {
          "h-[calc(var(--size-control-sm)-6px)]": size === "sm",
          "h-[calc(var(--size-control-md)-8px)]": size === "md",
        },
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

ChoiceOption.displayName = "ChoiceOption";
