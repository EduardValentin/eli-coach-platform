import * as React from "react";
import { DropdownMenu as RadixDropdownMenu } from "radix-ui";

import { cn } from "../lib/cn";

export const DropdownMenu = RadixDropdownMenu.Root;
export const DropdownMenuTrigger = RadixDropdownMenu.Trigger;

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
        "z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-field border bg-surface-base p-1 text-text-primary shadow-action motion-safe:data-[state=closed]:animate-[ui-popover-out_150ms_ease-out] motion-safe:data-[state=open]:animate-[ui-popover-in_150ms_ease-out]",
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
      "relative flex cursor-default items-center gap-2 rounded-tile px-2 py-1.5 text-sm outline-hidden select-none focus:bg-primary-soft focus:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[variant=destructive]:text-feedback-danger data-[variant=destructive]:focus:bg-feedback-danger/10 data-[variant=destructive]:focus:text-feedback-danger data-[variant=destructive]:*:[svg]:!text-feedback-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-text-muted",
      className,
    )}
    data-variant={variant}
    ref={ref}
    {...props}
  />
));

DropdownMenuItem.displayName = "DropdownMenuItem";
