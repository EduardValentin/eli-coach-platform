import { useEffect, useRef } from "react";

type FocusTarget = () => HTMLElement | null | undefined;

export function usePendingFocus() {
  const pending = useRef<FocusTarget | null>(null);

  useEffect(() => {
    const find = pending.current;
    if (!find) return;
    pending.current = null;
    find()?.focus();
  });

  return (find: FocusTarget) => {
    pending.current = find;
  };
}

export function actionsTriggerIn(selector: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `${selector} [aria-haspopup="menu"]`,
  );
}
