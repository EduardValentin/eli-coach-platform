import { programStartedSchema } from "~/features/coaching-sales/public/client-subscription";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/public/paths";
import {
  useConfirmedFetcherDialog,
  type DialogAfterAnswer,
} from "~/features/coaching-sales/ui/shared/use-confirmed-fetcher-dialog";

import { START_NOW_PROBLEM } from "./program-status-copy";

export type StartNowDialogWiring = {
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  problem: string | null;
  starting: boolean;
};

function startNowAnswer(answer: unknown): DialogAfterAnswer {
  return programStartedSchema.safeParse(answer).success
    ? { dialog: "close" }
    : { dialog: "problem", message: START_NOW_PROBLEM };
}

export function useStartNow() {
  const confirmed = useConfirmedFetcherDialog({
    action: COACHING_SALES_API_PATHS.programStart,
    readAnswer: startNowAnswer,
  });

  const dialog: StartNowDialogWiring = {
    onConfirm: confirmed.confirm,
    onOpenChange: confirmed.onOpenChange,
    open: confirmed.open,
    problem: confirmed.problem,
    starting: confirmed.pending,
  };

  return { askToConfirm: confirmed.openDialog, dialog };
}

export type StartNow = ReturnType<typeof useStartNow>;
