import { ConfirmDialog } from "~/shared/design-system/overlays";
import { useRef, useState } from "react";

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
  focusAfterApply?: HTMLElement | null;
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

export function useDestructiveConfirm() {
  const [pending, setPending] = useState<ConfirmRequest | null>(null);
  const lastPending = useRef<ConfirmRequest | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  if (pending) lastPending.current = pending;
  const shown = pending ?? lastPending.current;

  function request(next: ConfirmRequest) {
    if (next.lines.length === 0) {
      next.apply();
      return;
    }
    returnFocus.current = next.returnFocus ?? focusedControl();
    setPending(next);
  }

  function confirm() {
    if (pending?.focusAfterApply) returnFocus.current = pending.focusAfterApply;
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
