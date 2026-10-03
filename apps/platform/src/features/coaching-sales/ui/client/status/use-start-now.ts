import { useState } from "react";

import { programStartedSchema } from "~/features/coaching-sales/contracts/client-subscription";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/contracts/paths";
import { useConfirmedFetcherDialog } from "~/features/coaching-sales/ui/shared/use-confirmed-fetcher-dialog";

import { START_NOW_PROBLEM } from "./program-status-copy";

export type StartNowDialogWiring = {
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  problem: string | null;
  starting: boolean;
};

export function useStartNow() {
  const [problem, setProblem] = useState<string | null>(null);
  const confirmed = useConfirmedFetcherDialog({
    action: COACHING_SALES_API_PATHS.programStart,
    onSettled: (answer) => {
      if (programStartedSchema.safeParse(answer).success) {
        confirmed.close();
        return;
      }

      setProblem(START_NOW_PROBLEM);
    },
  });

  const changeOpen = (next: boolean) => {
    confirmed.setOpen(next);

    if (!next) {
      setProblem(null);
    }
  };

  const confirm = () => {
    setProblem(null);
    confirmed.send();
  };

  const dialog: StartNowDialogWiring = {
    onConfirm: confirm,
    onOpenChange: changeOpen,
    open: confirmed.open,
    problem,
    starting: confirmed.pending,
  };

  return { askToConfirm: confirmed.openDialog, dialog };
}

export type StartNow = ReturnType<typeof useStartNow>;
