/** The `aria-describedby` value for the ids that are present, or none when every id is absent. */
export function describedBy(ids: readonly (string | null | undefined | false)[]): string | undefined {
  return ids.filter(Boolean).join(' ') || undefined;
}
