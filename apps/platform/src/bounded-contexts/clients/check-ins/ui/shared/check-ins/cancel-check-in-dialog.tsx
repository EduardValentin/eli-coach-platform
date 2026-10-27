import { ConfirmDialog } from "~/shared/design-system/overlays";

import type { CheckInDecisions } from "./check-in-decisions";

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
