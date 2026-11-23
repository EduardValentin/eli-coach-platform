import { useLayoutEffect, useRef, useState, type RefObject } from "react";

export function useContainerWidthRem<Container extends HTMLElement>(): {
  ref: RefObject<Container | null>;
  widthRem: number;
} {
  const ref = useRef<Container>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const rem =
    typeof document === "undefined"
      ? 16
      : parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

  return { ref, widthRem: width / rem };
}
