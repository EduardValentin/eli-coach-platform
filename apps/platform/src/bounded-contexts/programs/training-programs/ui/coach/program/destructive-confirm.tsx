import { ConfirmDialog } from "~/shared/design-system/overlays";
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
    <ConfirmDialog
      confirmLabel={shown?.confirmLabel ?? ""}
      description={shown?.consequence}
      details={
        <ul className="grid gap-1">
          {shown?.lines.map((line, index) => (
            <li key={`${index}-${line}`}>{line}</li>
          ))}
        </ul>
      }
      onConfirm={confirm}
      onOpenChange={(open) => {
        if (!open) setPending(null);
      }}
      open={pending !== null}
      returnFocusTo={returnFocus}
      title={shown?.title ?? ""}
      tone="destructive"
    />
  );

  return { request, dialog };
}
