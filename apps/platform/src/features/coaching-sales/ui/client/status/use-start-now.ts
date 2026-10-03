import { useEffect, useEffectEvent, useState } from "react";
import { useFetcher } from "react-router";

import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/contracts/paths";

export type StartNowDialogWiring = {
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  starting: boolean;
};

export function useStartNow() {
  const [open, setOpen] = useState(false);
  const { data, state, submit } = useFetcher<unknown>();

  const settle = useEffectEvent(() => {
    setOpen(false);
  });

  useEffect(() => {
    if (data !== undefined) {
      settle();
    }
  }, [data]);

  const confirm = () => {
    void submit(
      {},
      {
        action: COACHING_SALES_API_PATHS.programStart,
        encType: "application/json",
        method: "post",
      },
    );
  };

  const dialog: StartNowDialogWiring = {
    onConfirm: confirm,
    onOpenChange: setOpen,
    open,
    starting: state !== "idle",
  };

  return { askToConfirm: () => setOpen(true), dialog };
}
