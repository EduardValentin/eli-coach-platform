import { useRef, type RefObject } from "react";

function focusedElement(): HTMLElement | null {
  return document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
}

export function useReturnFocusToOpener(
  returnFocusTo?: RefObject<HTMLElement | null>,
) {
  const opener = useRef<HTMLElement | null>(null);
  const openerDialog = useRef<HTMLElement | null>(null);

  const rememberOpener = () => {
    opener.current = focusedElement();
    openerDialog.current =
      opener.current?.closest<HTMLElement>('[role="dialog"]') ?? null;
  };

  const returnFocusToOpener = (event: Event) => {
    const target = [
      returnFocusTo?.current,
      opener.current,
      openerDialog.current,
    ].find((candidate) => candidate?.isConnected);
    if (!target) return;

    event.preventDefault();
    target.focus();
  };

  return { rememberOpener, returnFocusToOpener };
}
