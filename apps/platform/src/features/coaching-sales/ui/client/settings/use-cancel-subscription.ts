import {
  formatDayMonth,
  useCalendarDayTimeZone,
} from "@eli-coach-platform/ui/lib";
import { toast } from "@eli-coach-platform/ui/toast";
import { useRef, type RefObject } from "react";

import {
  subscriptionCancelledSchema,
  subscriptionRefusalSchema,
} from "~/features/coaching-sales/contracts/client-subscription";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/contracts/paths";
import {
  useConfirmedFetcherDialog,
  type DialogAfterAnswer,
} from "~/features/coaching-sales/ui/shared/use-confirmed-fetcher-dialog";

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

function refusalMessage(answer: unknown): string {
  const refusal = subscriptionRefusalSchema.safeParse(answer);

  return refusal.data?.message ?? CANCEL_UNAVAILABLE_MESSAGE;
}

export function useCancelSubscription(
  subscriptionHeading: RefObject<HTMLElement | null>,
) {
  const timeZone = useCalendarDayTimeZone();
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const confirmed = useConfirmedFetcherDialog({
    action: COACHING_SALES_API_PATHS.subscriptionCancellation,
    readAnswer: (answer): DialogAfterAnswer => {
      const cancelled = subscriptionCancelledSchema.safeParse(answer);

      if (!cancelled.success) {
        returnFocusTo.current = null;
        return { dialog: "problem", message: refusalMessage(answer) };
      }

      if (cancelled.data.rule === "full-refund") {
        return { dialog: "unchanged" };
      }

      toast.success(
        cancelledToast(formatDayMonth(cancelled.data.accessEndsAt, timeZone)),
      );
      return { dialog: "close" };
    },
  });

  const confirm = () => {
    returnFocusTo.current = subscriptionHeading.current;
    confirmed.confirm();
  };

  const dialog: CancelSubscriptionDialogWiring = {
    cancelling: confirmed.pending,
    onConfirm: confirm,
    onOpenChange: confirmed.onOpenChange,
    open: confirmed.open,
    problem: confirmed.problem,
    returnFocusTo,
  };

  return { askToConfirm: confirmed.openDialog, dialog };
}

export type CancelSubscription = ReturnType<typeof useCancelSubscription>;
