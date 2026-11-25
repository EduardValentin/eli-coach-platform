import { createContext, useContext } from "react";

import type { LibraryTarget } from "~/bounded-contexts/programs/training-programs/public/program-editing";

export const LibraryTargetContext = createContext<LibraryTarget | null>(null);

export const LIBRARY_TARGET_CLASS =
  "outline-2 outline-offset-4 outline-dashed outline-primary/40";

function placeKey(target: LibraryTarget): string {
  return Object.entries(target)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("&");
}

export function useIsLibraryTarget(place: LibraryTarget): boolean {
  const target = useContext(LibraryTargetContext);

  return target !== null && placeKey(target) === placeKey(place);
}
