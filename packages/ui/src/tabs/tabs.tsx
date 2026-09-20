import * as React from "react";
import { Tabs as RadixTabs } from "radix-ui";

import { cn } from "../lib/cn";

export const Tabs = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Root>
>(({ className, ...props }, ref) => (
  <RadixTabs.Root
    ref={ref}
    className={cn("flex flex-col gap-2", className)}
    {...props}
  />
));

Tabs.displayName = "Tabs";

export const TabsList = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixTabs.List>
>(({ className, ...props }, ref) => (
  <RadixTabs.List
    ref={ref}
    className={cn(
      "flex h-auto w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-card bg-surface-neutral p-1 text-text-muted max-sm:has-[>*:nth-child(4)]:grid max-sm:has-[>*:nth-child(4)]:w-full max-sm:has-[>*:nth-child(4)]:grid-cols-2",
      className,
    )}
    {...props}
  />
));

TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(({ className, ...props }, ref) => (
  <RadixTabs.Trigger
    ref={ref}
    className={cn(
      "inline-flex h-auto flex-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-control border border-transparent px-5 py-2.5 text-sm font-semibold text-text-primary transition-[color,box-shadow] focus-visible:border-border-focus disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-surface-base data-[state=active]:shadow-card [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    {...props}
  />
));

TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(({ className, ...props }, ref) => (
  <RadixTabs.Content
    ref={ref}
    className={cn("flex-1 rounded-card outline-none", className)}
    {...props}
  />
));

TabsContent.displayName = "TabsContent";
