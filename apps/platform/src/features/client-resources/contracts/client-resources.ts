import {
  RESOURCE_FILE_KINDS,
  type ClientResource,
  type ResourceDetailsProblems,
  type ResourceRefusal,
} from "@eli-coach-platform/domain/client-resources";
import { z } from "zod";

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

export type ClientResourceListing =
  | { status: "ready"; resources: ClientResourceView[] }
  | { status: "unavailable" };

export const clientResourceListSchema = z.array(clientResourceSchema);

export const addedResourceAnswerSchema = z.object({
  resource: clientResourceSchema,
});

export const refusedResourceAnswerSchema = z.object({
  refusal: z.enum(RESOURCE_REFUSALS),
});

const resourceDetailsProblemsSchema = z.object({
  title: z.enum(["missing", "too-long"]).optional(),
  description: z.enum(["too-long"]).optional(),
}) satisfies z.ZodType<ResourceDetailsProblems>;

export const resourceDetailsProblemsAnswerSchema = z.object({
  problems: resourceDetailsProblemsSchema,
});

export function presentClientResource(
  resource: ClientResource,
): ClientResourceView {
  const { id, title, description, file, addedAt, openedAt } =
    resource.toSnapshot();

  return {
    id,
    title,
    description,
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
