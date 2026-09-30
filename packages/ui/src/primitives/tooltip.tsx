import * as React from "react";
import { Tooltip as RadixTooltip } from "radix-ui";

import { cn } from "../lib/cn";

type TooltipProps = React.ComponentProps<typeof RadixTooltip.Root>;

export function Tooltip(props: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={0}>
      <RadixTooltip.Root {...props} />
    </RadixTooltip.Provider>
  );
}

export const TooltipTrigger = RadixTooltip.Trigger;

type TooltipContentProps = React.ComponentPropsWithoutRef<
  typeof RadixTooltip.Content
>;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof RadixTooltip.Content>,
  TooltipContentProps
>(({ children, className, sideOffset = 0, ...props }, ref) => (
  <RadixTooltip.Portal>
    <RadixTooltip.Content
      className={cn(
        "z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-field bg-primary px-3 py-1.5 text-xs text-balance text-primary-foreground motion-safe:animate-[ui-popover-in_150ms_ease-out] motion-safe:data-[state=closed]:animate-[ui-popover-out_150ms_ease-out]",
        className,
      )}
      ref={ref}
      sideOffset={sideOffset}
      {...props}
    >
      {children}
      <RadixTooltip.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-xs bg-primary fill-primary" />
    </RadixTooltip.Content>
  </RadixTooltip.Portal>
));

TooltipContent.displayName = "TooltipContent";
