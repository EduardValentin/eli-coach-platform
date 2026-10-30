export const MAX_RESOURCE_TAG_LENGTH = 30;

export type ResourceTagSnapshot = { tag: string; folded: string };

export type ResourceTagsResult =
  | { status: "valid"; tags: ResourceTags }
  | { status: "invalid"; problem: "too-long" };

export class ResourceTags {
  private constructor(private readonly tags: readonly ResourceTagSnapshot[]) {}

  static from(spellings: readonly string[]): ResourceTagsResult {
    const tagsByFolded = new Map<string, ResourceTagSnapshot>();

    for (const spelling of spellings) {
      const tag = spelling.trim().replace(/\s+/g, " ");
      const folded = tag.toLowerCase();

      if (tag.length > MAX_RESOURCE_TAG_LENGTH) {
        return { status: "invalid", problem: "too-long" };
      }
      if (tag.length > 0 && !tagsByFolded.has(folded)) {
        tagsByFolded.set(folded, { tag, folded });
      }
    }

    return {
      status: "valid",
      tags: new ResourceTags([...tagsByFolded.values()]),
    };
  }

  withStoredSpellings(
    vocabulary: readonly ResourceTagSnapshot[],
  ): ResourceTags {
    return new ResourceTags(
      this.tags.map(
        (tag) =>
          vocabulary.find((stored) => stored.folded === tag.folded) ?? tag,
      ),
    );
  }

  toSnapshot(): ResourceTagSnapshot[] {
    return this.tags.map((tag) => ({ ...tag }));
  }
}
