"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const PAIRS_A_FOURTH_TRIGGER_BELOW_SM =
  "max-sm:has-[>*:nth-child(4)]:grid max-sm:has-[>*:nth-child(4)]:w-full max-sm:has-[>*:nth-child(4)]:grid-cols-2 max-sm:has-[>*:nth-child(4)]:[&>*:nth-child(odd):last-child]:col-span-2";

const tabsListVariants = cva(
  "bg-muted text-muted-foreground inline-flex w-fit items-center justify-center flex",
  {
    variants: {
      variant: {
        default: "h-9 rounded-compact p-[3px]",
        segmented: `h-auto max-w-full flex-wrap gap-1 rounded-compact p-[3px] ${PAIRS_A_FOURTH_TRIGGER_BELOW_SM}`,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const tabsTriggerVariants = cva(
  "data-[state=active]:bg-active-surface data-[state=active]:text-primary-foreground focus-visible:border-focus-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground hover:text-primary inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-field border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "",
        segmented:
          "h-auto flex-auto px-5 py-2.5 font-semibold data-[state=active]:[&_[data-slot=badge]]:bg-surface-base data-[state=active]:[&_[data-slot=badge]]:text-primary data-[state=active]:[&_[data-slot=badge]]:opacity-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const tabsContentVariants = cva("flex-1 outline-none", {
  variants: {
    variant: {
      default: "",
      segmented: "rounded-card",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type TabsVariant = NonNullable<VariantProps<typeof tabsListVariants>["variant"]>;

const TabsVariantContext = React.createContext<TabsVariant>("default");

function Tabs({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & {
  variant?: TabsVariant;
}) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    </TabsVariantContext.Provider>
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const variant = React.useContext(TabsVariantContext);

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = React.useContext(TabsVariantContext);

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const variant = React.useContext(TabsVariantContext);

  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(tabsContentVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
