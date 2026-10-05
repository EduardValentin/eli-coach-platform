import {
  MAX_RESOURCE_FILE_BYTES,
  MAX_RESOURCE_PAGES,
  type ResourceFileKind,
  type ResourceRefusal,
} from "@eli-coach-platform/domain/client-resources";

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * 1024;
const MAX_UPLOAD_MEGABYTES = MAX_RESOURCE_FILE_BYTES / MEGABYTE;

export const RESOURCE_KIND_LABELS: Record<
  ResourceFileKind,
  { short: string; long: string }
> = {
  pdf: { short: "PDF", long: "PDF document" },
  word: { short: "DOC", long: "Word document" },
  excel: { short: "XLS", long: "Spreadsheet" },
  image: { short: "IMG", long: "Image" },
};

export const UPLOAD_REFUSAL_MESSAGES: Record<ResourceRefusal, string> = {
  "unsupported-type": "That file type can’t be added.",
  "too-large": `That file is over ${MAX_UPLOAD_MEGABYTES} MB.`,
  "too-many-pages": `That PDF has more than ${MAX_RESOURCE_PAGES} pages.`,
  unreadable:
    "That PDF can’t be opened. It may be damaged or password protected.",
};

export const RESOURCE_UPLOAD_HINT = `PDF, Word, Excel or image · up to ${MAX_UPLOAD_MEGABYTES} MB`;

export function formatFileSize(bytes: number): string {
  if (bytes >= MEGABYTE) return `${(bytes / MEGABYTE).toFixed(1)} MB`;
  if (bytes >= KILOBYTE) return `${Math.round(bytes / KILOBYTE)} KB`;

  return `${bytes} B`;
}

export function pageCountLabel(pageCount: number): string {
  return pageCount === 1 ? "1 page" : `${pageCount} pages`;
}

export function possessive(name: string): string {
  return `${name}’s`;
}
