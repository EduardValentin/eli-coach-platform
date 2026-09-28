import { useRef, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** Optional body — e.g. an itemized summary of what will change. */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  tone?: 'default' | 'destructive';
}

/**
 * Shared confirmation modal used for decisive add/edit/commit actions so every
 * confirmation across the app looks and behaves the same.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  confirmDisabled = false,
  tone = 'default',
}: ConfirmDialogProps) {
  const opener = useRef<HTMLElement | null>(null);

  const rememberOpener = () => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  };

  const returnFocusToOpener = (event: Event) => {
    if (!opener.current?.isConnected) return;

    event.preventDefault();
    opener.current.focus();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[80vh] gap-6 overflow-y-auto p-6 sm:max-w-md"
        data-parity-root="ConfirmDialog"
        onOpenAutoFocus={rememberOpener}
        onCloseAutoFocus={returnFocusToOpener}
      >
        <DialogHeader className="gap-2">
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription className="leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        {children}
        <DialogFooter className="gap-3 pt-2">
          <Button
            data-parity="cancel"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            data-parity="confirm"
            variant={tone === 'destructive' ? 'destructive' : 'primary'}
            size="sm"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
