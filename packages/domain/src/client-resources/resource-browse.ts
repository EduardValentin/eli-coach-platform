import {
  RESOURCE_SORT_DIRECTIONS,
  RESOURCE_SORT_KEYS,
  defaultResourceSortDirection,
  type ResourceSortDirection,
  type ResourceSortKey,
} from "./resource-sorts";
import { ResourceTags, type ResourceTagSnapshot } from "./resource-tags";

export type ResourceBrowseInput = {
  tag: string | null;
  search: string | null;
  sort: string | null;
  direction: string | null;
};

export type ResourceBrowseSnapshot = {
  tag: ResourceTagSnapshot | null;
  search: string;
  sort: ResourceSortKey;
  direction: ResourceSortDirection;
};

export class ResourceBrowse {
  private constructor(private readonly snapshot: ResourceBrowseSnapshot) {}

  static from(input: ResourceBrowseInput): ResourceBrowse {
    const tags = ResourceTags.from([input.tag ?? ""]);
    const sort =
      RESOURCE_SORT_KEYS.find((key) => key === input.sort) ?? "added";
    const direction =
      RESOURCE_SORT_DIRECTIONS.find(
        (candidate) => candidate === input.direction,
      ) ?? defaultResourceSortDirection(sort);

    return new ResourceBrowse({
      tag: tags.status === "valid" ? (tags.tags.toSnapshot()[0] ?? null) : null,
      search: (input.search ?? "").trim(),
      sort,
      direction,
    });
  }

  withTagAmong(held: readonly ResourceTagSnapshot[]): ResourceBrowse {
    const chosen = this.snapshot.tag?.folded;
    const tag = held.find((candidate) => candidate.folded === chosen) ?? null;

    return new ResourceBrowse({ ...this.snapshot, tag: tag && { ...tag } });
  }

  toSnapshot(): ResourceBrowseSnapshot {
    const { tag } = this.snapshot;

    return { ...this.snapshot, tag: tag && { ...tag } };
  }
}
