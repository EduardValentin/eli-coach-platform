import { Button } from "../primitives/button";
import { Dialog, DialogContent } from "./dialog";

type ConfirmTone = "default" | "destructive";

type ConfirmDialogProps = {
  cancelLabel?: string;
  confirmLabel: string;
  description: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
  tone?: ConfirmTone;
};

const CONFIRM_VARIANT = {
  default: "primary",
  destructive: "destructive",
} as const satisfies Record<ConfirmTone, string>;

export function ConfirmDialog({
  cancelLabel = "Cancel",
  confirmLabel,
  description,
  onConfirm,
  onOpenChange,
  open,
  title,
  tone = "default",
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
              variant={CONFIRM_VARIANT[tone]}
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
