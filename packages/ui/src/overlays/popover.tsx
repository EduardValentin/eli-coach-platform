import * as React from "react";
import { Popover as RadixPopover } from "radix-ui";

import { cn } from "../lib/cn";

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;

type PopoverContentProps = React.ComponentPropsWithoutRef<
  typeof RadixPopover.Content
>;

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof RadixPopover.Content>,
  PopoverContentProps
>(({ align = "start", className, sideOffset = 4, ...props }, ref) => (
  <RadixPopover.Portal>
    <RadixPopover.Content
      align={align}
      className={cn(
        "z-50 origin-(--radix-popover-content-transform-origin) rounded-field border bg-surface-base p-3 text-text-primary shadow-action outline-none motion-safe:data-[state=closed]:animate-[ui-popover-out_150ms_ease-out] motion-safe:data-[state=open]:animate-[ui-popover-in_150ms_ease-out]",
        className,
      )}
      ref={ref}
      sideOffset={sideOffset}
      {...props}
    />
  </RadixPopover.Portal>
));

PopoverContent.displayName = "PopoverContent";
