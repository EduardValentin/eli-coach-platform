import { Check } from "lucide-react";
import * as React from "react";
import { Checkbox as RadixCheckbox } from "radix-ui";

import { cn } from "../lib/cn";

type CheckboxProps = React.ComponentPropsWithoutRef<typeof RadixCheckbox.Root>;

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof RadixCheckbox.Root>,
  CheckboxProps
>(({ className, ...props }, ref) => (
  <RadixCheckbox.Root
    ref={ref}
    className={cn(
      "inline-flex size-5 shrink-0 items-center justify-center rounded-checkbox border border-border-subtle bg-surface-base text-brand-primary-foreground shadow-soft outline-none transition-[background-color,border-color,box-shadow] data-[state=checked]:border-brand-primary data-[state=checked]:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <RadixCheckbox.Indicator>
      <Check aria-hidden="true" className="size-3.5" />
    </RadixCheckbox.Indicator>
  </RadixCheckbox.Root>
));

Checkbox.displayName = "Checkbox";
