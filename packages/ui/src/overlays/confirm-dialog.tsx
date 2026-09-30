import { Button } from "../primitives/button";
import { Dialog, DialogContent } from "./dialog";

type ConfirmDialogProps = {
  cancelLabel?: string;
  confirmLabel: string;
  description: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

export function ConfirmDialog({
  cancelLabel = "Cancel",
  confirmLabel,
  description,
  onConfirm,
  onOpenChange,
  open,
  title,
}: ConfirmDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        data-parity-root="ConfirmDialog"
        description={description}
        footer={
          <>
            <Button
              data-parity="cancel"
              onClick={() => onOpenChange(false)}
              size="sm"
              variant="ghost"
            >
              {cancelLabel}
            </Button>
            <Button
              data-parity="confirm"
              onClick={onConfirm}
              size="sm"
              variant="primary"
            >
              {confirmLabel}
            </Button>
          </>
        }
        title={title}
      />
    </Dialog>
  );
}
