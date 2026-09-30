import { useSyncExternalStore } from "react";

const MOBILE_VIEWPORT_QUERY = "(max-width: 767px)";

function subscribeToViewport(onViewportChange: () => void) {
  const viewport = window.matchMedia(MOBILE_VIEWPORT_QUERY);
  viewport.addEventListener("change", onViewportChange);

  return () => viewport.removeEventListener("change", onViewportChange);
}

function isMobileViewport() {
  return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
}

function serverRendersDesktop() {
  return false;
}

export function useIsMobileViewport(): boolean {
  return useSyncExternalStore(
    subscribeToViewport,
    isMobileViewport,
    serverRendersDesktop,
  );
}
