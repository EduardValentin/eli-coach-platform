import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** The observed element's content width in root ems, or 0 until it is first measured. */
export function useContainerWidthRem<T extends HTMLElement>(): { ref: RefObject<T>; widthRem: number } {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const rem = typeof document === 'undefined' ? 16 : parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return { ref, widthRem: width / rem };
}
