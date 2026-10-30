import * as React from "react";
import { ToggleGroup as RadixToggleGroup } from "radix-ui";

import { cn } from "../lib/cn";
import { chipVariants, type ChipTone } from "../primitives/chip";

export type FilterChipTone = Extract<ChipTone, "primary" | "brand-secondary">;

// The tone belongs to the group: chips in one row cannot disagree about it,
// and no caller can leave it off a single chip and get a stray colour.
const FilterChipToneContext = React.createContext<FilterChipTone>("primary");

type FilterChipGroupProps = Omit<
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
>(({ className, onValueChange, tone = "primary", value, ...props }, ref) => (
  <FilterChipToneContext.Provider value={tone}>
    <RadixToggleGroup.Root
      ref={ref}
      className={cn("flex flex-wrap gap-2", className)}
      onValueChange={(nextValue) => onValueChange(nextValue || null)}
      type="single"
      value={value ?? ""}
      {...props}
    />
  </FilterChipToneContext.Provider>
));

FilterChipGroup.displayName = "FilterChipGroup";

type FilterChipProps = React.ComponentPropsWithoutRef<
  typeof RadixToggleGroup.Item
>;

export const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ className, ...props }, ref) => {
    const tone = React.useContext(FilterChipToneContext);

    return (
      <RadixToggleGroup.Item
        ref={ref}
        className={cn(chipVariants({ tone }), "h-auto min-h-0", className)}
        {...props}
      />
    );
  },
);

FilterChip.displayName = "FilterChip";
