import { ConfirmDialog } from "@eli-coach-platform/ui/overlays";
import { InlineProblem } from "@eli-coach-platform/ui/primitives";

import {
  CANCEL_ACTION_LABELS,
  CANCELLING_LABEL,
  KEEP_COACHING_LABEL,
  type OfferedCancellation,
} from "./subscription-copy";
import type { CancelSubscriptionDialogWiring } from "./use-cancel-subscription";

type CancelSubscriptionDialogProps = {
  confirmation: string;
  dialog: CancelSubscriptionDialogWiring;
  rule: OfferedCancellation;
};

export function CancelSubscriptionDialog({
  confirmation,
  dialog,
  rule,
}: CancelSubscriptionDialogProps) {
  const action = CANCEL_ACTION_LABELS[rule];

  return (
    <ConfirmDialog
      cancelLabel={KEEP_COACHING_LABEL}
      confirmDisabled={dialog.cancelling}
      confirmLabel={dialog.cancelling ? CANCELLING_LABEL : action}
      description={confirmation}
      onConfirm={dialog.onConfirm}
      onOpenChange={dialog.onOpenChange}
      open={dialog.open}
      returnFocusTo={dialog.returnFocusTo}
      title={action}
      tone="destructive"
    >
      {dialog.problem && (
        <InlineProblem data-parity="cancel-problem" role="alert">
          {dialog.problem}
        </InlineProblem>
      )}
    </ConfirmDialog>
  );
}
