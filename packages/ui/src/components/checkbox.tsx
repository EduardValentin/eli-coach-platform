import * as React from "react";
import { Checkbox as RadixCheckbox } from "radix-ui";

import { cn } from "../lib/cn";

export type CheckboxProps = React.ComponentPropsWithoutRef<
  typeof RadixCheckbox.Root
>;

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof RadixCheckbox.Root>,
  CheckboxProps
>(({ className, ...props }, ref) => (
  <RadixCheckbox.Root
    ref={ref}
    className={cn(
      "inline-flex size-5 shrink-0 items-center justify-center rounded-xs border border-border-subtle bg-surface-base text-brand-primary-foreground shadow-soft outline-none transition-[background-color,border-color,box-shadow] data-[state=checked]:border-brand-primary data-[state=checked]:bg-brand-primary focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <RadixCheckbox.Indicator>
      <svg
        aria-hidden="true"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 16 16"
      >
        <path
          d="m3 8 3 3 7-7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </RadixCheckbox.Indicator>
  </RadixCheckbox.Root>
));

Checkbox.displayName = "Checkbox";
