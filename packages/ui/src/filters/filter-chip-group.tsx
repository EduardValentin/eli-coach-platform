import * as React from "react";
import { ToggleGroup as RadixToggleGroup } from "radix-ui";

import { cn } from "../lib/cn";
import { chipVariants, type ChipTone } from "../primitives/chip";

export type FilterChipTone = Extract<ChipTone, "brand" | "brand-secondary">;

// The tone belongs to the group: chips in one row cannot disagree about it,
// and no caller can leave it off a single chip and get a stray colour.
const FilterChipToneContext = React.createContext<FilterChipTone>("brand");

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

type FilterChipProps = React.ComponentPropsWithoutRef<
  typeof RadixToggleGroup.Item
>;

export const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ className, ...props }, ref) => {
    const tone = React.useContext(FilterChipToneContext);

    return (
      <RadixToggleGroup.Item
        ref={ref}
        className={cn(chipVariants({ tone }), className)}
        {...props}
      />
    );
  },
);

FilterChip.displayName = "FilterChip";
