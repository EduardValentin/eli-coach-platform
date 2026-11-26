export const COMING_SOON_MARKER = { comingSoon: true } as const;

export function isComingSoonMarker(errorBody: unknown): boolean {
  return (
    typeof errorBody === "object" &&
    errorBody !== null &&
    "comingSoon" in errorBody &&
    errorBody.comingSoon === true
  );
}
