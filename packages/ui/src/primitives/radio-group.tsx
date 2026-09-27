import { CircleIcon } from "lucide-react";
import * as React from "react";
import { RadioGroup as RadixRadioGroup } from "radix-ui";

import { cn } from "../lib/cn";

type RadioGroupProps = React.ComponentPropsWithoutRef<
  typeof RadixRadioGroup.Root
>;

type RadioGroupItemProps = React.ComponentPropsWithoutRef<
  typeof RadixRadioGroup.Item
>;

export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadixRadioGroup.Root>,
  RadioGroupProps
>(({ className, ...props }, ref) => (
  <RadixRadioGroup.Root
    ref={ref}
    className={cn("grid gap-3", className)}
    {...props}
  />
));

RadioGroup.displayName = "RadioGroup";

export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadixRadioGroup.Item>,
  RadioGroupItemProps
>(({ className, ...props }, ref) => (
  <RadixRadioGroup.Item
    ref={ref}
    className={cn(
      "aspect-square size-5 shrink-0 rounded-full border border-border-subtle bg-surface-base shadow-soft outline-none transition-[background-color,border-color,box-shadow] data-[state=checked]:border-primary disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <RadixRadioGroup.Indicator className="relative flex items-center justify-center">
      <CircleIcon
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 fill-primary text-primary"
      />
    </RadixRadioGroup.Indicator>
  </RadixRadioGroup.Item>
));

RadioGroupItem.displayName = "RadioGroupItem";
