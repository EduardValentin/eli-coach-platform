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
        segmented: `h-auto max-w-full flex-wrap gap-1 rounded-compact border border-control-border-soft p-[3px] ${PAIRS_A_FOURTH_TRIGGER_BELOW_SM}`,
        rail: "grid h-auto w-full items-stretch rounded-none bg-transparent p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const ACTIVE_FILL_CLASS = "data-[state=active]:bg-active-surface data-[state=active]:text-primary-foreground";

const tabsTriggerVariants = cva(
  "focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground hover:text-primary relative hit-area inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-field px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: ACTIVE_FILL_CLASS,
        segmented:
          ACTIVE_FILL_CLASS + " h-auto flex-auto px-4 py-[11px] font-semibold sm:px-5 data-[state=active]:[&_[data-slot=badge]]:bg-surface-base data-[state=active]:[&_[data-slot=badge]]:text-primary data-[state=active]:[&_[data-slot=badge]]:opacity-100",
        rail: "h-auto flex-auto justify-normal rounded-none font-normal whitespace-normal text-text-secondary hover:text-text-secondary data-[state=active]:z-10 data-[state=active]:selected-cell",
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
      rail: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type TabsVariant = NonNullable<VariantProps<typeof tabsListVariants>["variant"]>;

type TabsContextValue = {
  variant: TabsVariant;
  hasMountedList: boolean;
  mountList: () => () => void;
  mountedPanels: ReadonlySet<string>;
  registerPanel: (value: string) => () => void;
};

const TabsContext = React.createContext<TabsContextValue>({
  variant: "default",
  hasMountedList: true,
  mountList: () => () => {},
  mountedPanels: new Set(),
  registerPanel: () => () => {},
});

function Tabs({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & {
  variant?: TabsVariant;
}) {
  const [mountedLists, setMountedLists] = React.useState(0);
  const mountList = React.useCallback(() => {
    setMountedLists((count) => count + 1);
    return () => setMountedLists((count) => count - 1);
  }, []);
  const [mountedPanels, setMountedPanels] = React.useState<ReadonlySet<string>>(new Set());
  const registerPanel = React.useCallback((value: string) => {
    setMountedPanels((panels) => new Set(panels).add(value));
    return () =>
      setMountedPanels((panels) => {
        const remaining = new Set(panels);
        remaining.delete(value);
        return remaining;
      });
  }, []);
  const context = React.useMemo(
    () => ({ variant, hasMountedList: mountedLists > 0, mountList, mountedPanels, registerPanel }),
    [variant, mountedLists, mountList, mountedPanels, registerPanel],
  );

  return (
    <TabsContext.Provider value={context}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    </TabsContext.Provider>
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const { variant, mountList } = React.useContext(TabsContext);
  React.useEffect(mountList, [mountList]);

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const { variant, mountedPanels } = React.useContext(TabsContext);
  const withoutDanglingPanel = mountedPanels.has(props.value) ? {} : { "aria-controls": undefined };

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
      {...withoutDanglingPanel}
    />
  );
});
TabsTrigger.displayName = 'TabsTrigger';

function TabsContent({
  className,
  labelWithoutTabs,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content> & {
  labelWithoutTabs?: string;
}) {
  const { variant, hasMountedList, registerPanel } = React.useContext(TabsContext);
  const registeredWhileMounted = React.useRef<(() => void) | null>(null);
  const trackPanel = React.useCallback(
    (panel: HTMLDivElement | null) => {
      registeredWhileMounted.current?.();
      registeredWhileMounted.current = panel ? registerPanel(props.value) : null;
    },
    [registerPanel, props.value],
  );
  const nameWithoutTabs = hasMountedList || labelWithoutTabs === undefined ? {} : { "aria-labelledby": undefined, "aria-label": labelWithoutTabs };

  return (
    <TabsPrimitive.Content
      ref={trackPanel}
      data-slot="tabs-content"
      className={cn(tabsContentVariants({ variant }), className)}
      {...nameWithoutTabs}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
