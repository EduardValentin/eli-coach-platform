import * as React from "react";
import { Toggle as RadixToggle } from "radix-ui";

import { cn } from "../lib/cn";

export type ToggleChipProps = Omit<
  React.ComponentPropsWithoutRef<typeof RadixToggle.Root>,
  "defaultPressed" | "onPressedChange" | "pressed"
> & {
  onPressedChange: (pressed: boolean) => void;
  pressed: boolean;
};

/** A multi-select pill: several may be pressed at once, each stating its own state. */
export const ToggleChip = React.forwardRef<HTMLButtonElement, ToggleChipProps>(
  ({ className, ...props }, ref) => (
    <RadixToggle.Root
      ref={ref}
      className={cn(
        "inline-flex min-h-9 items-center rounded-pill border border-control-border-soft bg-surface-base px-3 text-body-sm font-medium text-text-secondary outline-none transition-[background-color,border-color,color] duration-150 ease-out hover:border-text-primary hover:text-text-primary focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary data-[state=on]:border-brand-primary/30 data-[state=on]:bg-brand-primary-soft data-[state=on]:text-brand-primary",
        className,
      )}
      {...props}
    />
  ),
);

ToggleChip.displayName = "ToggleChip";
