import * as React from "react";
import { Switch as RadixSwitch } from "radix-ui";

import { cn } from "../lib/cn";

export const Switch = React.forwardRef<
  React.ElementRef<typeof RadixSwitch.Root>,
  React.ComponentPropsWithoutRef<typeof RadixSwitch.Root>
>(({ className, ...props }, ref) => (
  <RadixSwitch.Root
    className={cn(
      "peer relative hit-area inline-flex h-4.5 w-8 shrink-0 items-center rounded-full border border-transparent outline-none transition-all data-[state=checked]:bg-primary data-[state=unchecked]:bg-switch-background disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    data-slot="switch"
    ref={ref}
    {...props}
  >
    <RadixSwitch.Thumb
      className="pointer-events-none block size-4 rounded-full bg-surface-base ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
      data-slot="switch-thumb"
    />
  </RadixSwitch.Root>
));

Switch.displayName = "Switch";
