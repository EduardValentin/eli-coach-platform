import * as React from "react";
import { Tooltip as RadixTooltip } from "radix-ui";

import { cn } from "../lib/cn";

export function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof RadixTooltip.Provider>) {
  return (
    <RadixTooltip.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

export function Tooltip(props: React.ComponentProps<typeof RadixTooltip.Root>) {
  return (
    <TooltipProvider>
      <RadixTooltip.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

export function TooltipTrigger(
  props: React.ComponentProps<typeof RadixTooltip.Trigger>,
) {
  return <RadixTooltip.Trigger data-slot="tooltip-trigger" {...props} />;
}

export function TooltipContent({
  children,
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof RadixTooltip.Content>) {
  return (
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-floating-over-sheet w-fit max-w-sm origin-(--radix-tooltip-content-transform-origin) rounded-field bg-surface-inverted px-3 py-1.5 text-xs text-balance text-text-inverted motion-safe:data-[state=closed]:animate-[ui-popover-out_150ms_ease-out] motion-safe:data-[state=open]:animate-[ui-popover-in_150ms_ease-out]",
          className,
        )}
        {...props}
      >
        {children}
        <RadixTooltip.Arrow className="z-floating-over-sheet size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-surface-inverted fill-surface-inverted" />
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  );
}
