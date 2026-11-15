import * as React from "react";

const DESKTOP_QUERY = "(min-width: 64em)";
const WIDE_QUERY = "(min-width: 80em)";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(() => window.matchMedia(query).matches);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function useIsDesktop() {
  return useMediaQuery(DESKTOP_QUERY);
}

export function useIsWide() {
  return useMediaQuery(WIDE_QUERY);
}
