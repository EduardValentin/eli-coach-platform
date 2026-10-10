import {
  RESOURCE_FILE_KINDS,
  type BrowsedResources,
  type ClientResource,
  type ResourceBrowseSnapshot,
  type ResourceDetailsProblems,
  type ResourceRefusal,
} from "@eli-coach-platform/domain/client-resources";
import { z } from "zod";

import type { ResourceBrowseView } from "~/features/client-resources/public/resource-browse";

const RESOURCE_REFUSALS = [
  "unsupported-type",
  "too-large",
  "too-many-pages",
  "unreadable",
] as const satisfies readonly ResourceRefusal[];

const clientResourceSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  file: z.object({
    originalName: z.string(),
    downloadName: z.string(),
    kind: z.enum(RESOURCE_FILE_KINDS),
    sizeBytes: z.number().int().nonnegative(),
    pageCount: z.number().int().positive().nullable(),
  }),
  addedAt: z.iso.datetime(),
  openedAt: z.iso.datetime().nullable(),
});

export type ClientResourceView = z.infer<typeof clientResourceSchema>;

type ResourceTagOptionView = { tag: string; count: number };

type ReadyResourceListing = {
  status: "ready";
  resources: ClientResourceView[];
  tagOptions: ResourceTagOptionView[];
  browse: ResourceBrowseView;
  searched: number;
  total: number;
};

type UnavailableResourceListing = { status: "unavailable" };

export type ClientResourceListing =
  ReadyResourceListing | UnavailableResourceListing;

export type CoachResourceListing =
  | (ReadyResourceListing & { vocabulary: string[] })
  | UnavailableResourceListing;

const clientResourceListSchema = z.array(clientResourceSchema);

export const addedResourceAnswerSchema = z.object({
  resource: clientResourceSchema,
});

export const changedResourceAnswerSchema = z.object({
  resource: clientResourceSchema,
});

export const removedResourceAnswerSchema = z.object({
  status: z.literal("removed"),
});

export const resourceDetailsRequestSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
});

export const refusedResourceAnswerSchema = z.object({
  refusal: z.enum(RESOURCE_REFUSALS),
});

const resourceDetailsProblemsSchema = z.object({
  title: z.enum(["missing", "too-long"]).optional(),
  description: z.enum(["too-long"]).optional(),
  tags: z.enum(["too-long"]).optional(),
}) satisfies z.ZodType<ResourceDetailsProblems>;

export const resourceDetailsProblemsAnswerSchema = z.object({
  problems: resourceDetailsProblemsSchema,
});

export function presentClientResource(
  resource: ClientResource,
): ClientResourceView {
  const { id, title, description, tags, file, addedAt, openedAt } =
    resource.toSnapshot();

  return {
    id,
    title,
    description,
    tags: tags.map(({ tag }) => tag),
    file: {
      originalName: file.originalName,
      downloadName: resource.file.downloadName(),
      kind: resource.file.kind,
      sizeBytes: file.sizeBytes,
      pageCount: file.pageCount,
    },
    addedAt: addedAt.toISOString(),
    openedAt: openedAt?.toISOString() ?? null,
  };
}

export function presentResourceListing(listing: {
  browsing: BrowsedResources;
  browse: ResourceBrowseSnapshot;
}): ReadyResourceListing {
  const { resources, tagOptions, searched, total } = listing.browsing;

  return {
    status: "ready",
    resources: clientResourceListSchema.parse(
      resources.map(presentClientResource),
    ),
    tagOptions: tagOptions.map(({ tag, count }) => ({ tag: tag.tag, count })),
    browse: { ...listing.browse, tag: listing.browse.tag?.tag ?? null },
    searched,
    total,
  };
}
