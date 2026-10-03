import {
  formatDayMonth,
  useCalendarDayTimeZone,
} from "@eli-coach-platform/ui/lib";
import { toast } from "@eli-coach-platform/ui/toast";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useFetcher } from "react-router";

import {
  subscriptionCancelledSchema,
  subscriptionRefusalSchema,
} from "~/features/coaching-sales/contracts/client-subscription";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/contracts/paths";

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
  focusOnceAccessStays: RefObject<HTMLElement | null>,
) {
  const timeZone = useCalendarDayTimeZone();
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const { data, state, submit } = useFetcher<unknown>();

  const settle = useEffectEvent((response: unknown) => {
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
      setOpen(false);
    }
  });

  useEffect(() => {
    if (data !== undefined) {
      settle(data);
    }
  }, [data]);

  const changeOpen = (next: boolean) => {
    setOpen(next);

    if (!next) {
      setProblem(null);
    }
  };

  const confirm = () => {
    setProblem(null);
    returnFocusTo.current = focusOnceAccessStays.current;
    void submit(
      {},
      {
        action: COACHING_SALES_API_PATHS.subscriptionCancellation,
        encType: "application/json",
        method: "post",
      },
    );
  };

  const dialog: CancelSubscriptionDialogWiring = {
    cancelling: state !== "idle",
    onConfirm: confirm,
    onOpenChange: changeOpen,
    open,
    problem,
    returnFocusTo,
  };

  return { askToConfirm: () => setOpen(true), dialog };
}

export type CancelSubscription = ReturnType<typeof useCancelSubscription>;
