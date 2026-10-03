import {
  formatDayMonth,
  useCalendarDayTimeZone,
} from "@eli-coach-platform/ui/lib";
import { toast } from "@eli-coach-platform/ui/toast";
import { useRef, useState, type RefObject } from "react";

import {
  subscriptionCancelledSchema,
  subscriptionRefusalSchema,
} from "~/features/coaching-sales/contracts/client-subscription";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/contracts/paths";
import { useConfirmedFetcherDialog } from "~/features/coaching-sales/ui/shared/use-confirmed-fetcher-dialog";

import {
  CANCEL_UNAVAILABLE_MESSAGE,
  cancelledToast,
} from "./subscription-copy";

export type CancelSubscriptionDialogWiring = {
  cancelling: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  problem: string | null;
  returnFocusTo: RefObject<HTMLElement | null>;
};

function refusalMessage(response: unknown): string {
  const refusal = subscriptionRefusalSchema.safeParse(response);

  return refusal.data?.message ?? CANCEL_UNAVAILABLE_MESSAGE;
}

export function useCancelSubscription(
  subscriptionHeading: RefObject<HTMLElement | null>,
) {
  const timeZone = useCalendarDayTimeZone();
  const [problem, setProblem] = useState<string | null>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const confirmed = useConfirmedFetcherDialog({
    action: COACHING_SALES_API_PATHS.subscriptionCancellation,
    onSettled: (response) => {
      const cancelled = subscriptionCancelledSchema.safeParse(response);

      if (!cancelled.success) {
        returnFocusTo.current = null;
        setProblem(refusalMessage(response));
        return;
      }

      if (cancelled.data.rule === "no-refund") {
        toast.success(
          cancelledToast(formatDayMonth(cancelled.data.accessEndsAt, timeZone)),
        );
        confirmed.close();
      }
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
    returnFocusTo.current = subscriptionHeading.current;
    confirmed.send();
  };

  const dialog: CancelSubscriptionDialogWiring = {
    cancelling: confirmed.pending,
    onConfirm: confirm,
    onOpenChange: changeOpen,
    open: confirmed.open,
    problem,
    returnFocusTo,
  };

  return { askToConfirm: confirmed.openDialog, dialog };
}

export type CancelSubscription = ReturnType<typeof useCancelSubscription>;
