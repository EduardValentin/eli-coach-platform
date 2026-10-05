import { useSyncExternalStore } from "react";

type ViewportQuery = {
  subscribe: (onViewportChange: () => void) => () => void;
  matches: () => boolean;
};

function viewportQuery(media: string): ViewportQuery {
  return {
    subscribe: (onViewportChange) => {
      const viewport = window.matchMedia(media);
      viewport.addEventListener("change", onViewportChange);

      return () => viewport.removeEventListener("change", onViewportChange);
    },
    matches: () => window.matchMedia(media).matches,
  };
}

const MOBILE_VIEWPORT = viewportQuery("(max-width: 767px)");

const DESKTOP_VIEWPORT = viewportQuery("(min-width: 1024px)");

function serverMatchesNoViewport() {
  return false;
}

function useViewportMatches(query: ViewportQuery): boolean {
  return useSyncExternalStore(
    query.subscribe,
    query.matches,
    serverMatchesNoViewport,
  );
}

export function useIsMobileViewport(): boolean {
  return useViewportMatches(MOBILE_VIEWPORT);
}

export function useIsDesktopViewport(): boolean {
  return useViewportMatches(DESKTOP_VIEWPORT);
}
