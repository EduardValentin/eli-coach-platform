export const COMING_SOON_MARKER = { comingSoon: true } as const;

export function isComingSoonMarker(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "comingSoon" in data &&
    data.comingSoon === true
  );
}
