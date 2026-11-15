"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

import { OpenStateContext, useOpenState, useTriggerControls } from "./open-state";

function Collapsible({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  const openState = useOpenState({ open, defaultOpen, onOpenChange });

  return (
    <OpenStateContext.Provider value={openState.open}>
      <CollapsiblePrimitive.Root data-slot="collapsible" {...props} {...openState} />
    </OpenStateContext.Provider>
  );
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  const controls = useTriggerControls();

  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...controls}
      {...props}
    />
  );
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
