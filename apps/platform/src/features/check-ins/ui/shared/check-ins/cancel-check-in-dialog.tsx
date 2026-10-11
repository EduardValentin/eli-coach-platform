import { ConfirmDialog } from "@eli-coach-platform/ui/overlays";

import {
  formatClockTime,
  formatShortDay,
} from "~/features/assessment-calls/public/call-moment";

import type { CheckInDecisions } from "./check-in-decisions";
import type { ListedCheckIn } from "./check-in-listing";

type CheckInCancellation = {
  checkInId: string;
  description: string;
  successMessage: string;
};

type CancelCheckInDialogProps = {
  cancellation: CheckInCancellation;
  decisions: CheckInDecisions;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function CancelCheckInDialog({
  cancellation: { checkInId, description, successMessage },
  decisions,
  onOpenChange,
  open,
}: CancelCheckInDialogProps) {
  return (
    <ConfirmDialog
      cancelLabel="Keep"
      confirmLabel="Cancel check-in"
      description={description}
      onConfirm={() => {
        decisions.decide({ checkInId, kind: "cancel", successMessage });
        onOpenChange(false);
      }}
      onOpenChange={onOpenChange}
      open={open}
      title="Cancel this check-in?"
      tone="destructive"
    />
  );
}

export function dayAndTimeOf(checkIn: ListedCheckIn, timeZone: string): string {
  const startsAt = new Date(checkIn.startsAt);

  return `${formatShortDay(startsAt, timeZone)} at ${formatClockTime(startsAt, timeZone)}`;
}
