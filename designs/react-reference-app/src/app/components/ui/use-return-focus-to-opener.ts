import { useRef, type RefObject } from 'react';

function focusedElement(): HTMLElement | null {
  return document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
}

function isFocusLost() {
  return document.activeElement === null || document.activeElement === document.body;
}

export function useReturnFocusToOpener(returnFocusTo?: RefObject<HTMLElement | null>) {
  const opener = useRef<HTMLElement | null>(null);
  const openerDialog = useRef<HTMLElement | null>(null);

  const rememberOpener = () => {
    opener.current = focusedElement();
    openerDialog.current =
      opener.current?.closest<HTMLElement>('[role="dialog"]') ?? null;
  };

  const focusTarget = () =>
    [returnFocusTo?.current, opener.current, openerDialog.current].find(
      (candidate) => candidate?.isConnected,
    );

  const returnFocusToOpener = (event: Event) => {
    const target = focusTarget();
    if (!target) return;

    event.preventDefault();
    target.focus();
  };

  const returnLostFocusToOpener = (event: Event) => {
    event.preventDefault();
    if (isFocusLost()) focusTarget()?.focus();
  };

  return { rememberOpener, returnFocusToOpener, returnLostFocusToOpener };
}
