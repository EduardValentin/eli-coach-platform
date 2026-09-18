import { useEffect, useRef } from "react";

export function useStepHeadingFocus<Step>(step: Step) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(step);

  useEffect(() => {
    if (shownStep.current === step) {
      return;
    }

    shownStep.current = step;
    headingRef.current?.focus();
  }, [step]);

  return headingRef;
}
