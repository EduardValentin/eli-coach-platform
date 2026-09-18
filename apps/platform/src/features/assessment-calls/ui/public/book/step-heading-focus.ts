import { useEffect, useRef, useState } from "react";

export function useStepHeadingFocus() {
  const [heading, setHeading] = useState<HTMLHeadingElement | null>(null);
  const firstHeading = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (!heading) {
      return;
    }

    firstHeading.current ??= heading;

    if (heading !== firstHeading.current) {
      heading.focus();
    }
  }, [heading]);

  return setHeading;
}
