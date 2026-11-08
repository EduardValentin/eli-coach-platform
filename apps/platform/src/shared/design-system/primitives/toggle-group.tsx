import * as React from "react";
import { ToggleGroup as RadixToggleGroup } from "radix-ui";

import { cn } from "../lib/cn";

type ToggleGroupProps = Omit<
  React.ComponentPropsWithoutRef<typeof RadixToggleGroup.Root>,
  "defaultValue" | "onValueChange" | "type" | "value"
> & {
  "aria-label": string;
  onValueChange: (value: string) => void;
  value: string;
};

export const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ className, onValueChange, value, ...props }, ref) => (
    <RadixToggleGroup.Root
      ref={ref}
      className={cn(
        "flex w-fit items-center gap-2 rounded-full border border-control-border-soft bg-surface-base p-1 shadow-card",
        className,
      )}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onValueChange(nextValue);
        }
      }}
      type="single"
      value={value}
      {...props}
    />
  ),
);

ToggleGroup.displayName = "ToggleGroup";

type ToggleGroupItemProps = React.ComponentPropsWithoutRef<
  typeof RadixToggleGroup.Item
>;

export const ToggleGroupItem = React.forwardRef<
  HTMLButtonElement,
  ToggleGroupItemProps
>(({ className, ...props }, ref) => (
  <RadixToggleGroup.Item
    ref={ref}
    className={cn(
      "inline-flex min-w-0 flex-none items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-copy-muted outline-none transition-colors hover:bg-surface-base focus:z-10 disabled:pointer-events-none disabled:opacity-50 data-[state=off]:hover:text-text-primary data-[state=on]:bg-surface-inverted data-[state=on]:text-text-inverted data-[state=on]:hover:bg-surface-inverted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    {...props}
  />
));

ToggleGroupItem.displayName = "ToggleGroupItem";
