import * as React from "react";

const DESKTOP_BREAKPOINT = 1024;
const WIDE_BREAKPOINT = 1280;

function useMinWidth(pixels: number) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${pixels}px)`);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [pixels]);

  return matches;
}

export function useIsDesktop() {
  return useMinWidth(DESKTOP_BREAKPOINT);
}

export function useIsWide() {
  return useMinWidth(WIDE_BREAKPOINT);
}
