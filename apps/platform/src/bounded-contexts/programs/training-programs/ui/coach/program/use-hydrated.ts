import { useSyncExternalStore } from "react";

function subscribeToNothing() {
  return () => {};
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}
