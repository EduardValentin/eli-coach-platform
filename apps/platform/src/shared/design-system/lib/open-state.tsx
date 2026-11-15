import { createContext, useCallback, useContext, useState } from "react";

type OpenStateProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type TriggerControls = { "aria-controls"?: string };

type UnmanagedTrigger = { open: boolean; contentId: string };

export const OpenStateContext = createContext(false);

export function useOpenState({
  open,
  defaultOpen = false,
  onOpenChange,
}: OpenStateProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);

  const changeOpen = useCallback(
    (next: boolean) => {
      setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  return { open: open ?? uncontrolledOpen, onOpenChange: changeOpen };
}

export function useTriggerControls(
  unmanaged?: UnmanagedTrigger,
): TriggerControls {
  const contextOpen = useContext(OpenStateContext);
  if (unmanaged) {
    return {
      "aria-controls": unmanaged.open ? unmanaged.contentId : undefined,
    };
  }
  return contextOpen ? {} : { "aria-controls": undefined };
}
