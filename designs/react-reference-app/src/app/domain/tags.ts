export const MAX_TAG_LENGTH = 30;

export function normalizeTag(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function sameTag(one: string, other: string): boolean {
  return (
    normalizeTag(one).toLocaleLowerCase() ===
    normalizeTag(other).toLocaleLowerCase()
  );
}

export function hasTag(tags: readonly string[], tag: string): boolean {
  return tags.some((existing) => sameTag(existing, tag));
}

export function resolveTag(
  text: string,
  vocabulary: readonly string[],
): string | null {
  const tag = normalizeTag(text);
  if (tag.length === 0) return null;

  return vocabulary.find((existing) => sameTag(existing, tag)) ?? tag;
}

export function uniqueTags(tags: readonly string[]): string[] {
  return tags.reduce<string[]>((unique, tag) => {
    const normalized = normalizeTag(tag);
    if (normalized.length === 0 || hasTag(unique, normalized)) return unique;

    return [...unique, normalized];
  }, []);
}

export function withTag(tags: readonly string[], tag: string): string[] {
  return uniqueTags([...tags, tag]);
}

export function withoutTag(tags: readonly string[], tag: string): string[] {
  return tags.filter((existing) => !sameTag(existing, tag));
}

export function compareTags(one: string, other: string): number {
  return one.localeCompare(other, undefined, { sensitivity: 'base' });
}

export function tagSuggestions(
  query: string,
  vocabulary: readonly string[],
  chosen: readonly string[],
): string[] {
  const needle = normalizeTag(query).toLocaleLowerCase();
  const available = vocabulary.filter((tag) => !hasTag(chosen, tag));
  const matching = available.filter((tag) =>
    tag.toLocaleLowerCase().includes(needle),
  );
  const startsWithNeedle = (tag: string) =>
    tag.toLocaleLowerCase().startsWith(needle) ? 0 : 1;

  return [...matching].sort(
    (one, other) =>
      startsWithNeedle(one) - startsWithNeedle(other) || compareTags(one, other),
  );
}

export function isNewTag(text: string, vocabulary: readonly string[]): boolean {
  const tag = normalizeTag(text);

  return tag.length > 0 && !hasTag(vocabulary, tag);
}
