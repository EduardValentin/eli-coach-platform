import { useRef, useState } from 'react';
import { ConfirmDialog } from '../../ui/confirm-dialog';

export type ResetRequest = { title: string; confirmLabel: string; lines: string[]; apply: () => void };

export function useResetConfirm() {
  const [pending, setPending] = useState<ResetRequest | null>(null);
  const lastPending = useRef<ResetRequest | null>(null);
  if (pending) lastPending.current = pending;
  const shown = pending ?? lastPending.current;

  function request(next: ResetRequest) {
    if (next.lines.length === 0) next.apply();
    else setPending(next);
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
      onConfirm={() => {
        pending?.apply();
        setPending(null);
      }}
    />
  );

  return { request, dialog };
}
