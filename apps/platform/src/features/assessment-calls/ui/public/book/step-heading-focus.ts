import { useCallback, useRef } from "react";

export function useStepHeadingFocus<Step>(step: Step) {
  const renderedStep = useRef(step);
  const isFocusPending = useRef(false);

  if (renderedStep.current !== step) {
    renderedStep.current = step;
    isFocusPending.current = true;
  }

  return useCallback((heading: HTMLHeadingElement | null) => {
    if (!heading || !isFocusPending.current) {
      return;
    }

    isFocusPending.current = false;
    heading.focus();
  }, []);
}
