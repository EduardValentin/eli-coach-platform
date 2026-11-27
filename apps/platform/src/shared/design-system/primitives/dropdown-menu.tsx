import { ChevronRight } from "lucide-react";
import * as React from "react";
import { DropdownMenu as RadixDropdownMenu } from "radix-ui";

import { cn } from "../lib/cn";
import {
  OpenStateContext,
  useOpenState,
  useTriggerControls,
} from "../lib/open-state";

export function DropdownMenu({
  defaultOpen,
  onOpenChange,
  open,
  ...props
}: React.ComponentProps<typeof RadixDropdownMenu.Root>) {
  const openState = useOpenState({ defaultOpen, onOpenChange, open });

  return (
    <OpenStateContext.Provider value={openState.open}>
      <RadixDropdownMenu.Root {...props} {...openState} />
    </OpenStateContext.Provider>
  );
}

export function DropdownMenuTrigger(
  props: React.ComponentProps<typeof RadixDropdownMenu.Trigger>,
) {
  const controls = useTriggerControls();

  return <RadixDropdownMenu.Trigger {...controls} {...props} />;
}

type DropdownMenuContentProps = React.ComponentPropsWithoutRef<
  typeof RadixDropdownMenu.Content
>;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof RadixDropdownMenu.Content>,
  DropdownMenuContentProps
>(({ className, sideOffset = 4, ...props }, ref) => (
  <RadixDropdownMenu.Portal>
    <RadixDropdownMenu.Content
      className={cn(
        "z-floating-over-sheet max-h-(--radix-dropdown-menu-content-available-height) min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-field border bg-surface-base p-1 text-text-primary shadow-action motion-safe:data-[state=closed]:animate-[ui-popover-out_150ms_ease-out] motion-safe:data-[state=open]:animate-[ui-popover-in_150ms_ease-out]",
        className,
      )}
      ref={ref}
      sideOffset={sideOffset}
      {...props}
    />
  </RadixDropdownMenu.Portal>
));

DropdownMenuContent.displayName = "DropdownMenuContent";

type DropdownMenuItemProps = React.ComponentPropsWithoutRef<
  typeof RadixDropdownMenu.Item
> & {
  variant?: "default" | "destructive";
};

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof RadixDropdownMenu.Item>,
  DropdownMenuItemProps
>(({ className, variant = "default", ...props }, ref) => (
  <RadixDropdownMenu.Item
    className={cn(
      "[--focus-ring-offset:-2px] [--focus-ring-halo:0_0_#0000] relative flex min-h-12 cursor-default items-center gap-2 rounded-tile px-2 py-1.5 text-sm outline-hidden select-none focus:bg-primary-soft focus:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 data-[variant=destructive]:text-feedback-danger data-[variant=destructive]:focus:bg-feedback-danger/10 data-[variant=destructive]:focus:text-feedback-danger data-[variant=destructive]:*:[svg]:!text-feedback-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-text-muted",
      className,
    )}
    data-focus-ring=""
    data-variant={variant}
    ref={ref}
    {...props}
  />
));

DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuSub = RadixDropdownMenu.Sub;

export const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof RadixDropdownMenu.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof RadixDropdownMenu.SubTrigger>
>(({ children, className, ...props }, ref) => (
  <RadixDropdownMenu.SubTrigger
    className={cn(
      "[--focus-ring-offset:-2px] [--focus-ring-halo:0_0_#0000] flex min-h-12 cursor-default items-center gap-2 rounded-tile px-2 py-1.5 text-sm outline-hidden select-none focus:bg-primary-soft focus:text-primary data-[state=open]:bg-primary-soft data-[state=open]:text-primary [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-text-muted",
      className,
    )}
    data-focus-ring=""
    ref={ref}
    {...props}
  >
    {children}
    <ChevronRight aria-hidden="true" className="ml-auto size-4" />
  </RadixDropdownMenu.SubTrigger>
));

DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

export const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof RadixDropdownMenu.SubContent>,
  React.ComponentPropsWithoutRef<typeof RadixDropdownMenu.SubContent>
>(({ className, ...props }, ref) => (
  <RadixDropdownMenu.Portal>
    <RadixDropdownMenu.SubContent
      className={cn(
        "z-floating-over-sheet min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-field border bg-surface-base p-1 text-text-primary shadow-action-hover motion-safe:data-[state=closed]:animate-[ui-popover-out_150ms_ease-out] motion-safe:data-[state=open]:animate-[ui-popover-in_150ms_ease-out]",
        className,
      )}
      ref={ref}
      {...props}
    />
  </RadixDropdownMenu.Portal>
));

DropdownMenuSubContent.displayName = "DropdownMenuSubContent";
