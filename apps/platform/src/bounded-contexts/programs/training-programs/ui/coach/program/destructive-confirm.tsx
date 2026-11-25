import { Dialog, DialogContent } from "~/shared/design-system/overlays";
import { Button } from "~/shared/design-system/primitives";
import { useMemo, useRef, useState, type RefObject } from "react";

import {
  BlockLoss,
  type Block,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

export type ConfirmRequest = {
  title: string;
  confirmLabel: string;
  consequence?: string;
  lines: string[];
  apply: () => void;
  returnFocus?: HTMLElement | null;
  // Read once the change has landed, since the control it names may only exist then.
  focusAfterApply?: () => HTMLElement | null;
};

type RemovedBlock = { block: Block; index: number; apply: () => void };

export function removeBlockRequest({
  block,
  index,
  apply,
}: RemovedBlock): ConfirmRequest {
  return {
    title: `Remove block ${index + 1}?`,
    confirmLabel: "Remove block",
    consequence:
      "The block leaves the plan, the blocks after it move up, and these sessions are deleted:",
    lines: BlockLoss.describe(block, { kind: "remove-block" }),
    apply,
  };
}

function focusedControl(): HTMLElement | null {
  const focused = document.activeElement;

  return focused instanceof HTMLElement && focused !== document.body
    ? focused
    : null;
}

function applyWithoutAsking({ apply, focusAfterApply }: ConfirmRequest) {
  apply();
  if (!focusAfterApply) return;
  requestAnimationFrame(() => focusAfterApply()?.focus());
}

type DestructiveAlertDialogProps = {
  request: ConfirmRequest | null;
  open: boolean;
  returnFocusTo: RefObject<HTMLElement | null>;
  onCancel: () => void;
  onConfirm: () => void;
};

// Built on DialogContent because the shared ConfirmDialog stays a dismissible dialog with a corner close.
function DestructiveAlertDialog({
  request,
  open,
  returnFocusTo,
  onCancel,
  onConfirm,
}: DestructiveAlertDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        data-parity-root="ConfirmDialog"
        description={request?.consequence}
        details={
          <ul className="grid gap-1">
            {request?.lines.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ul>
        }
        dismissal="locked"
        footer={
          <>
            <Button
              data-parity="cancel"
              onClick={onCancel}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              data-parity="confirm"
              onClick={onConfirm}
              size="sm"
              variant="destructive"
            >
              {request?.confirmLabel}
            </Button>
          </>
        }
        onEscapeKeyDown={onCancel}
        returnFocusTo={returnFocusTo}
        role="alertdialog"
        title={request?.title ?? ""}
      />
    </Dialog>
  );
}

export function useDestructiveConfirm() {
  const [pending, setPending] = useState<ConfirmRequest | null>(null);
  const lastPending = useRef<ConfirmRequest | null>(null);
  const resolveFocusOnClose = useRef<() => HTMLElement | null>(() => null);
  const returnFocus = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return resolveFocusOnClose.current();
      },
    }),
    [],
  );
  if (pending) lastPending.current = pending;
  const shown = pending ?? lastPending.current;

  function request(next: ConfirmRequest) {
    if (next.lines.length === 0) {
      applyWithoutAsking(next);
      return;
    }
    const control = next.returnFocus ?? focusedControl();
    resolveFocusOnClose.current = () => control;
    setPending(next);
  }

  function confirm() {
    if (pending?.focusAfterApply)
      resolveFocusOnClose.current = pending.focusAfterApply;
    pending?.apply();
    setPending(null);
  }

  const dialog = (
    <DestructiveAlertDialog
      onCancel={() => setPending(null)}
      onConfirm={confirm}
      open={pending !== null}
      request={shown}
      returnFocusTo={returnFocus}
    />
  );

  return { request, dialog };
}
