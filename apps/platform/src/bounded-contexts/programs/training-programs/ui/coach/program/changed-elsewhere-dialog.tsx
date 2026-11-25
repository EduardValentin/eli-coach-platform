import { Dialog, DialogContent } from "~/shared/design-system/overlays";
import { Button } from "~/shared/design-system/primitives";
import type { RefObject } from "react";

type ChangedElsewhereDialogProps = {
  open: boolean;
  onReload: () => void;
  returnFocusTo: RefObject<HTMLElement | null>;
};

export function ChangedElsewhereDialog({
  open,
  onReload,
  returnFocusTo,
}: ChangedElsewhereDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        data-parity-root="ChangedElsewhereDialog"
        description="It was saved from another tab or device after you opened it here, so what you changed just now wasn’t saved. Reload to see the newer draft."
        dismissal="locked"
        footer={
          <Button onClick={onReload} size="sm" variant="primary">
            Reload
          </Button>
        }
        returnFocusTo={returnFocusTo}
        role="alertdialog"
        title="This draft changed elsewhere"
      />
    </Dialog>
  );
}
