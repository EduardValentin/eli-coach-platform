import { useMemo, useRef, useState, type RefObject } from 'react';
import type { Block } from '../../../domain/program';
import { describeLoss } from '../../../domain/weekEditing';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';

/** A change that deletes work: `lines` name what is lost, and `consequence`, when given, says in one sentence what the change does. */
export type ConfirmRequest = {
  title: string;
  confirmLabel: string;
  consequence?: string;
  lines: string[];
  apply: () => void;
  returnFocus?: HTMLElement | null;
  /** Read once the change has landed, since the control it names may only exist then. */
  focusAfterApply?: () => HTMLElement | null;
};

export function removeBlockRequest(block: Block, index: number, apply: () => void): ConfirmRequest {
  return {
    title: `Remove block ${index + 1}?`,
    confirmLabel: 'Remove block',
    consequence: 'The block leaves the plan, the blocks after it move up, and these sessions are deleted:',
    lines: describeLoss(block, { kind: 'remove-block' }),
    apply,
  };
}

function focusedControl(): HTMLElement | null {
  const focused = document.activeElement;
  return focused instanceof HTMLElement && focused !== document.body ? focused : null;
}

function applyWithoutAsking({ apply, focusAfterApply }: ConfirmRequest) {
  apply();
  if (!focusAfterApply) return;
  requestAnimationFrame(() => focusAfterApply()?.focus());
}

/** Applies a change at once when it deletes nothing; otherwise asks first, in an alert dialog that lists what is lost. */
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

  const dialog = (
    <AlertDialog
      open={pending !== null}
      onOpenChange={open => {
        if (!open) setPending(null);
      }}
    >
      <AlertDialogContent data-parity-root="ConfirmDialog" returnFocusTo={returnFocus} className="max-h-[80vh] gap-6 overflow-y-auto p-6 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="leading-none">{shown?.title ?? ''}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="grid gap-2 leading-relaxed">
              {shown?.consequence && <p>{shown.consequence}</p>}
              <ul className="grid gap-1">
                {shown?.lines.map((line, index) => (
                  <li key={`${index}-${line}`}>{line}</li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 pt-2">
          <AlertDialogCancel data-parity="cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction
            data-parity="confirm"
            variant="destructive"
            onClick={() => {
              if (pending?.focusAfterApply) resolveFocusOnClose.current = pending.focusAfterApply;
              pending?.apply();
            }}
          >
            {shown?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { request, dialog };
}
