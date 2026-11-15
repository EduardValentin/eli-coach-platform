import * as React from "react";

type OpenStateProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type TriggerControls = { "aria-controls"?: string };

type UnmanagedTrigger = { open: boolean; contentId: string };

const OpenStateContext = React.createContext(false);

function useOpenState({ open, defaultOpen = false, onOpenChange }: OpenStateProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);

  const changeOpen = React.useCallback(
    (next: boolean) => {
      setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  return { open: open ?? uncontrolledOpen, onOpenChange: changeOpen };
}

function useTriggerControls(unmanaged?: UnmanagedTrigger): TriggerControls {
  const contextOpen = React.useContext(OpenStateContext);
  if (unmanaged) {
    return { "aria-controls": unmanaged.open ? unmanaged.contentId : undefined };
  }
  return contextOpen ? {} : { "aria-controls": undefined };
}

export { OpenStateContext, useOpenState, useTriggerControls };
