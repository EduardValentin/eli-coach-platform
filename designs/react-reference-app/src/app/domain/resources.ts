import { compareTags, sameTag, uniqueTags } from './tags';

export const RESOURCE_FILE_KINDS = ['pdf', 'word', 'excel', 'image'] as const;

export type ResourceFileKind = (typeof RESOURCE_FILE_KINDS)[number];

const KIND_BY_EXTENSION: Readonly<Record<string, ResourceFileKind>> = {
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  odt: 'word',
  xls: 'excel',
  xlsx: 'excel',
  ods: 'excel',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  webp: 'image',
};

export const RESOURCE_UPLOAD_ACCEPT = Object.keys(KIND_BY_EXTENSION)
  .map((extension) => `.${extension}`)
  .join(',');

export const RESOURCE_MAX_BYTES = 25 * 1024 * 1024;

const PAGE_PREVIEWED_KINDS: readonly ResourceFileKind[] = ['pdf', 'image'];

export function hasPagePreview(kind: ResourceFileKind): boolean {
  return PAGE_PREVIEWED_KINDS.includes(kind);
}

export type ResourceFile = {
  name: string;
  kind: ResourceFileKind;
  sizeBytes: number;
};

export type Resource = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  tags: readonly string[];
  file: ResourceFile;
  pageImageUrls: readonly string[];
  addedAt: Date;
  openedAt: Date | null;
};

export type ResourceDetails = {
  title: string;
  description: string;
  tags: readonly string[];
};

export type UploadRefusal = 'unsupported-type' | 'too-large';

export type UploadCheck =
  | { accepted: true; kind: ResourceFileKind }
  | { accepted: false; refusal: UploadRefusal };

export type UploadCandidate = { name: string; size: number };

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');

  return dot < 0 ? '' : fileName.slice(dot + 1).toLocaleLowerCase();
}

export function resourceFileKindFor(fileName: string): ResourceFileKind | null {
  return KIND_BY_EXTENSION[extensionOf(fileName)] ?? null;
}

export function checkResourceUpload(candidate: UploadCandidate): UploadCheck {
  const kind = resourceFileKindFor(candidate.name);
  if (!kind) return { accepted: false, refusal: 'unsupported-type' };
  if (candidate.size > RESOURCE_MAX_BYTES) {
    return { accepted: false, refusal: 'too-large' };
  }

  return { accepted: true, kind };
}

export function titleFromFileName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const words = stem.replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();

  return words.charAt(0).toLocaleUpperCase() + words.slice(1);
}

export function resourceDetailsFrom(input: ResourceDetails): ResourceDetails | null {
  const title = input.title.trim();
  if (title.length === 0) return null;

  return {
    title,
    description: input.description.trim(),
    tags: uniqueTags(input.tags),
  };
}

function sameTagList(one: readonly string[], other: readonly string[]): boolean {
  return (
    one.length === other.length &&
    one.every((tag, index) => tag === other[index])
  );
}

export function detailsDiffer(
  resource: Pick<Resource, 'title' | 'description' | 'tags'>,
  details: ResourceDetails,
): boolean {
  return (
    resource.title !== details.title ||
    resource.description !== details.description ||
    !sameTagList(resource.tags, details.tags)
  );
}

export function isUnopened(resource: Resource): boolean {
  return resource.openedAt === null;
}

export function hasUnopenedResources(resources: readonly Resource[]): boolean {
  return resources.some(isUnopened);
}

export function pageCountOf(resource: Resource): number {
  return resource.pageImageUrls.length;
}

export function thumbnailUrlOf(resource: Resource): string | null {
  return resource.pageImageUrls[0] ?? null;
}

export function coachTagVocabulary(resources: readonly Resource[]): string[] {
  const oldestFirst = [...resources].sort(
    (one, other) => one.addedAt.getTime() - other.addedAt.getTime(),
  );

  return uniqueTags(oldestFirst.flatMap((resource) => resource.tags)).sort(
    compareTags,
  );
}

export type TagCount = { tag: string; count: number };

export function tagCounts(resources: readonly Resource[]): TagCount[] {
  return coachTagVocabulary(resources).map((tag) => ({
    tag,
    count: resources.filter((resource) =>
      resource.tags.some((held) => sameTag(held, tag)),
    ).length,
  }));
}

export type ResourceSortKey = 'added' | 'title';

export type ResourceSortDirection = 'asc' | 'desc';

export type ResourceSort = {
  key: ResourceSortKey;
  direction: ResourceSortDirection;
};

export const DEFAULT_RESOURCE_SORT: ResourceSort = {
  key: 'added',
  direction: 'desc',
};

export function defaultResourceSortDirection(
  key: ResourceSortKey,
): ResourceSortDirection {
  return key === 'added' ? 'desc' : 'asc';
}

export type ResourceFilter = { tag: string | null; query: string };

export const NO_RESOURCE_FILTER: ResourceFilter = { tag: null, query: '' };

export function isFiltering(filter: ResourceFilter): boolean {
  return filter.tag !== null || filter.query.trim().length > 0;
}

function matchesFilter(resource: Resource, filter: ResourceFilter): boolean {
  const query = filter.query.trim().toLocaleLowerCase();
  const tagMatches =
    filter.tag === null ||
    resource.tags.some((tag) => sameTag(tag, filter.tag ?? ''));

  return tagMatches && resource.title.toLocaleLowerCase().includes(query);
}

function orderedByDefaultDirection(
  resources: readonly Resource[],
  key: ResourceSortKey,
): Resource[] {
  if (key === 'title') {
    return [...resources].sort((one, other) =>
      one.title.localeCompare(other.title, undefined, { sensitivity: 'base' }),
    );
  }

  return [...resources].sort(
    (one, other) => other.addedAt.getTime() - one.addedAt.getTime(),
  );
}

export function orderResources(
  resources: readonly Resource[],
  sort: ResourceSort,
): Resource[] {
  const ordered = orderedByDefaultDirection(resources, sort.key);

  return sort.direction === defaultResourceSortDirection(sort.key)
    ? ordered
    : ordered.reverse();
}

export function browseResources(
  resources: readonly Resource[],
  filter: ResourceFilter,
  sort: ResourceSort,
): Resource[] {
  return orderResources(
    resources.filter((resource) => matchesFilter(resource, filter)),
    sort,
  );
}
