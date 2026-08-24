import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ToggleGroup as RadixToggleGroup } from "radix-ui";

import { cn } from "../lib/cn";

export const filterChipVariants = cva(
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

export type FilterChipTone = NonNullable<
  VariantProps<typeof filterChipVariants>["tone"]
>;

// The tone belongs to the group: chips in one row cannot disagree about it,
// and no caller can leave it off a single chip and get a stray colour.
const FilterChipToneContext = React.createContext<FilterChipTone>("brand");

export type FilterChipGroupProps = Omit<
  React.ComponentPropsWithoutRef<typeof RadixToggleGroup.Root>,
  "defaultValue" | "onValueChange" | "type" | "value"
> & {
  "aria-label": string;
  onValueChange: (value: string | null) => void;
  tone?: FilterChipTone;
  value: string | null;
};

export const FilterChipGroup = React.forwardRef<
  HTMLDivElement,
  FilterChipGroupProps
>(({ className, onValueChange, tone = "brand", value, ...props }, ref) => (
  <FilterChipToneContext.Provider value={tone}>
    <RadixToggleGroup.Root
      ref={ref}
      className={cn("flex flex-wrap gap-2", className)}
      onValueChange={(values) => {
        // Radix's multiple mode keeps the chips as buttons that state their own
        // pressed status, which single mode trades for radio semantics — and a
        // radio checks whatever the arrow keys land on, filtering the page per
        // keystroke. One choice at a time is this group's own rule instead: the
        // value the caller already holds is dropped, and pressing the pressed
        // chip reports nothing selected rather than promising a state it cannot
        // reach.
        const [pressedValue] = values.filter(
          (candidate) => candidate !== value,
        );

        onValueChange(pressedValue ?? null);
      }}
      type="multiple"
      value={value === null ? [] : [value]}
      {...props}
    />
  </FilterChipToneContext.Provider>
));

FilterChipGroup.displayName = "FilterChipGroup";

export type FilterChipProps = React.ComponentPropsWithoutRef<
  typeof RadixToggleGroup.Item
>;

export const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ className, ...props }, ref) => {
    const tone = React.useContext(FilterChipToneContext);

    return (
      <RadixToggleGroup.Item
        ref={ref}
        className={cn(filterChipVariants({ tone }), className)}
        {...props}
      />
    );
  },
);

FilterChip.displayName = "FilterChip";
