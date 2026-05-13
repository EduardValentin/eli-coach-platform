import { useEffect, useRef, useState } from "react";

export type UseHasEnteredViewportOptions = {
  threshold?: number;
};

export function useHasEnteredViewport<TElement extends HTMLElement>(
  options: UseHasEnteredViewportOptions = {},
) {
  const { threshold = 0.2 } = options;
  const ref = useRef<TElement>(null);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);

  useEffect(() => {
    if (hasEnteredViewport) {
      return;
    }

    const node = ref.current;

    if (!node || typeof IntersectionObserver === "undefined") {
      setHasEnteredViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        setHasEnteredViewport(true);
        observer.disconnect();
      },
      { threshold },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [hasEnteredViewport, threshold]);

  return { hasEnteredViewport, ref };
}
