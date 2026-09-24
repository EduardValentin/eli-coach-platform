import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as RadixTabs } from "radix-ui";

import { cn } from "../lib/cn";

const PAIRS_A_FOURTH_TRIGGER_BELOW_SM =
  "max-sm:has-[>*:nth-child(4)]:grid max-sm:has-[>*:nth-child(4)]:w-full max-sm:has-[>*:nth-child(4)]:grid-cols-2 max-sm:has-[>*:nth-child(4)]:[&>*:nth-child(odd):last-child]:col-span-2";

const tabsListClasses = cva(
  "inline-flex w-fit items-center justify-center bg-surface-neutral text-text-muted",
  {
    variants: {
      variant: {
        default: "h-9 rounded-compact p-[3px]",
        segmented: cn(
          "h-auto max-w-full flex-wrap gap-1 rounded-compact p-[3px]",
          PAIRS_A_FOURTH_TRIGGER_BELOW_SM,
        ),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const tabsTriggerClasses = cva(
  "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-field border border-transparent px-2 py-1 text-sm font-medium text-text-primary transition-[color,box-shadow] hover:text-primary focus-visible:border-border-focus disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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

const tabsContentClasses = cva("flex-1 outline-none", {
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

type TabsVariant = NonNullable<VariantProps<typeof tabsListClasses>["variant"]>;

const TabsVariantContext = React.createContext<TabsVariant>("default");

type TabsProps = React.ComponentPropsWithoutRef<typeof RadixTabs.Root> & {
  variant?: TabsVariant;
};

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <TabsVariantContext.Provider value={variant}>
      <RadixTabs.Root
        ref={ref}
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    </TabsVariantContext.Provider>
  ),
);

Tabs.displayName = "Tabs";

export const TabsList = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixTabs.List>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(TabsVariantContext);

  return (
    <RadixTabs.List
      ref={ref}
      className={cn(tabsListClasses({ variant }), className)}
      {...props}
    />
  );
});

TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(TabsVariantContext);

  return (
    <RadixTabs.Trigger
      ref={ref}
      className={cn(tabsTriggerClasses({ variant }), className)}
      {...props}
    />
  );
});

TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(TabsVariantContext);

  return (
    <RadixTabs.Content
      ref={ref}
      className={cn(tabsContentClasses({ variant }), className)}
      {...props}
    />
  );
});

TabsContent.displayName = "TabsContent";
