import * as React from "react";
import { Collapsible as RadixCollapsible } from "radix-ui";

import {
  OpenStateContext,
  useOpenState,
  useTriggerControls,
} from "../lib/open-state";

export function Collapsible({
  defaultOpen,
  onOpenChange,
  open,
  ...props
}: React.ComponentProps<typeof RadixCollapsible.Root>) {
  const openState = useOpenState({ defaultOpen, onOpenChange, open });

  return (
    <OpenStateContext.Provider value={openState.open}>
      <RadixCollapsible.Root
        data-slot="collapsible"
        {...props}
        {...openState}
      />
    </OpenStateContext.Provider>
  );
}

export function CollapsibleTrigger(
  props: React.ComponentProps<typeof RadixCollapsible.Trigger>,
) {
  const controls = useTriggerControls();

  return (
    <RadixCollapsible.Trigger
      data-slot="collapsible-trigger"
      {...controls}
      {...props}
    />
  );
}

export function CollapsibleContent(
  props: React.ComponentProps<typeof RadixCollapsible.Content>,
) {
  return (
    <RadixCollapsible.Content data-slot="collapsible-content" {...props} />
  );
}
