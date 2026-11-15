import * as React from "react";

type OpenStateProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

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

function useTriggerControls(): { "aria-controls"?: undefined } {
  return React.useContext(OpenStateContext) ? {} : { "aria-controls": undefined };
}

export { OpenStateContext, useOpenState, useTriggerControls };
export type { OpenStateProps };
