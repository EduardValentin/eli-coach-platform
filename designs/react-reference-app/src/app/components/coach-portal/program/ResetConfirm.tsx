import { useRef, useState } from 'react';
import { ConfirmDialog } from '../../ui/confirm-dialog';

export type ResetRequest = { title: string; confirmLabel: string; lines: string[]; apply: () => void; returnFocus?: HTMLElement | null };

function focusedControl(): HTMLElement | null {
  const focused = document.activeElement;
  return focused instanceof HTMLElement && focused !== document.body ? focused : null;
}

export function useResetConfirm() {
  const [pending, setPending] = useState<ResetRequest | null>(null);
  const lastPending = useRef<ResetRequest | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  if (pending) lastPending.current = pending;
  const shown = pending ?? lastPending.current;

  function request(next: ResetRequest) {
    if (next.lines.length === 0) {
      next.apply();
      return;
    }
    returnFocus.current = next.returnFocus ?? focusedControl();
    setPending(next);
  }

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={open => {
        if (!open) setPending(null);
      }}
      title={shown?.title ?? ''}
      description={shown?.lines.map((line, index) => (
        <span key={`${index}-${line}`} className="block">
          {line}
        </span>
      ))}
      confirmLabel={shown?.confirmLabel}
      tone="destructive"
      returnFocusTo={returnFocus}
      onConfirm={() => {
        pending?.apply();
        setPending(null);
      }}
    />
  );

  return { request, dialog };
}
