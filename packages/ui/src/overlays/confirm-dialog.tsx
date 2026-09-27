import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import { useRef } from "react";

import { Button } from "../primitives/button";

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
  const opener = useRef<HTMLElement | null>(null);

  return (
    <RadixDialog.Root onOpenChange={onOpenChange} open={open}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-overlay-modal motion-safe:data-[state=closed]:animate-[ui-overlay-out_150ms_ease] motion-safe:data-[state=open]:animate-[ui-overlay-in_150ms_ease]" />
        <RadixDialog.Content
          className="fixed top-1/2 left-1/2 z-50 grid max-h-[80vh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 overflow-y-auto rounded-compact border bg-surface-base p-6 shadow-action-hover motion-safe:data-[state=closed]:animate-[ui-popover-out_200ms_ease] motion-safe:data-[state=open]:animate-[ui-popover-in_200ms_ease] sm:max-w-md"
          data-parity-root="ConfirmDialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
          onOpenAutoFocus={() => {
            opener.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
        >
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <RadixDialog.Title className="text-lg leading-none font-semibold">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Description className="text-sm leading-relaxed text-text-muted">
              {description}
            </RadixDialog.Description>
          </div>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
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
          </div>
          <RadixDialog.Close className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100">
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Close</span>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
