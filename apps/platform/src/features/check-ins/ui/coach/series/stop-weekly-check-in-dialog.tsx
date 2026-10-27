import { ConfirmDialog } from "~/shared/design-system/overlays";
import { toast } from "~/shared/design-system/toast";
import { useEffect, useEffectEvent, type RefObject } from "react";
import { generatePath, useFetcher } from "react-router";

import {
  checkInRefusalSchema,
  checkInSeriesOutcomeSchema,
} from "~/features/check-ins/public/check-ins";
import { CHECK_INS_API_PATHS } from "~/features/check-ins/public/paths";

type StopWeeklyCheckInDialogProps = {
  clientFirstName: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  returnFocusTo: RefObject<HTMLElement | null>;
  seriesId: string;
};

export function StopWeeklyCheckInDialog({
  clientFirstName,
  onOpenChange,
  open,
  returnFocusTo,
  seriesId,
}: StopWeeklyCheckInDialogProps) {
  const fetcher = useFetcher<unknown>();
  const stopping = fetcher.state !== "idle";

  const reportReply = useEffectEvent((reply: unknown) => {
    if (checkInSeriesOutcomeSchema.safeParse(reply).success) {
      toast.success("Weekly check-in stopped");
    } else if (checkInRefusalSchema.safeParse(reply).success) {
      toast.error("The weekly check-in changed meanwhile.");
    } else {
      toast.error("The weekly check-in wasn't stopped. Try again.");
    }
    onOpenChange(false);
  });

  useEffect(() => {
    if (fetcher.data !== undefined) {
      reportReply(fetcher.data);
    }
  }, [fetcher.data]);

  return (
    <ConfirmDialog
      cancelLabel="Keep"
      confirmDisabled={stopping}
      confirmLabel="Stop"
      description={`Every week still to come is cancelled and ${clientFirstName} is told.`}
      onConfirm={() => {
        void fetcher.submit(
          {},
          {
            action: generatePath(CHECK_INS_API_PATHS.seriesStop, { seriesId }),
            encType: "application/json",
            method: "post",
          },
        );
      }}
      onOpenChange={(next) => {
        if (next || !stopping) onOpenChange(next);
      }}
      open={open}
      returnFocusTo={returnFocusTo}
      title="Stop the weekly check-in?"
      tone="destructive"
    />
  );
}
