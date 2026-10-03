import { ConfirmDialog } from "@eli-coach-platform/ui/overlays";

import { IMMEDIATE_START_BODY } from "~/features/coaching-sales/ui/shared/immediate-start-copy";

import {
  KEEP_MY_14_DAYS_LABEL,
  START_NOW_TITLE,
  YES_START_NOW_LABEL,
} from "./program-status-copy";
import type { StartNowDialogWiring } from "./use-start-now";

export function StartNowDialog({ dialog }: { dialog: StartNowDialogWiring }) {
  return (
    <ConfirmDialog
      cancelLabel={KEEP_MY_14_DAYS_LABEL}
      confirmDisabled={dialog.starting}
      confirmLabel={YES_START_NOW_LABEL}
      description={IMMEDIATE_START_BODY}
      onConfirm={dialog.onConfirm}
      onOpenChange={dialog.onOpenChange}
      open={dialog.open}
      title={START_NOW_TITLE}
    />
  );
}
