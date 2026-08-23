import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ToggleGroup as RadixToggleGroup } from "radix-ui";

import { cn } from "../lib/cn";

export const toggleChipVariants = cva(
  "inline-flex min-h-11 items-center rounded-pill border bg-surface-base px-4 py-2 text-body-sm text-text-primary outline-none transition-[background-color,border-color,color] duration-150 ease-out focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary",
  {
    variants: {
      tone: {
        brand:
          "border-control-border-soft data-[state=off]:hover:border-brand-primary data-[state=off]:hover:text-brand-primary data-[state=on]:border-brand-primary data-[state=on]:bg-brand-primary data-[state=on]:text-brand-primary-foreground",
        "brand-secondary":
          "border-control-border-soft data-[state=off]:hover:border-brand-secondary data-[state=off]:hover:text-brand-secondary data-[state=on]:border-brand-secondary data-[state=on]:bg-brand-secondary data-[state=on]:text-brand-secondary-foreground",
      },
    },
    defaultVariants: {
      tone: "brand",
    },
  },
);

export type ToggleChipGroupProps = {
  "aria-label": string;
  children: React.ReactNode;
  className?: string;
  onValueChange: (value: string) => void;
  value: string;
};

export const ToggleChipGroup = React.forwardRef<
  HTMLDivElement,
  ToggleChipGroupProps
>(({ className, onValueChange, ...props }, ref) => (
  <RadixToggleGroup.Root
    ref={ref}
    className={cn("flex flex-wrap gap-2", className)}
    onValueChange={(value) => {
      // Radix reports an empty value when the checked chip is pressed again.
      // A radio keeps its selection until a sibling takes it, so that press
      // stays a no-op rather than reaching the caller as "nothing selected".
      if (value) {
        onValueChange(value);
      }
    }}
    // Radix gives single-select items role="radio"; its own root role="group"
    // would leave them without the parent that role requires.
    role="radiogroup"
    type="single"
    {...props}
  />
));

ToggleChipGroup.displayName = "ToggleChipGroup";

export type ToggleChipGroupItemProps = React.ComponentPropsWithoutRef<
  typeof RadixToggleGroup.Item
> &
  VariantProps<typeof toggleChipVariants>;

export const ToggleChipGroupItem = React.forwardRef<
  HTMLButtonElement,
  ToggleChipGroupItemProps
>(({ className, tone, ...props }, ref) => (
  <RadixToggleGroup.Item
    ref={ref}
    className={cn(toggleChipVariants({ tone }), className)}
    {...props}
  />
));

ToggleChipGroupItem.displayName = "ToggleChipGroupItem";
