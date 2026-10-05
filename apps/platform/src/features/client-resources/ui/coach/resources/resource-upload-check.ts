import {
  MAX_RESOURCE_FILE_BYTES,
  type ResourceFileKind,
  type ResourceRefusal,
} from "@eli-coach-platform/domain/client-resources";

const KIND_BY_EXTENSION: Readonly<Record<string, ResourceFileKind>> = {
  pdf: "pdf",
  doc: "word",
  docx: "word",
  odt: "word",
  xls: "excel",
  xlsx: "excel",
  ods: "excel",
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
};

export const RESOURCE_UPLOAD_ACCEPT = Object.keys(KIND_BY_EXTENSION)
  .map((extension) => `.${extension}`)
  .join(",");

type UploadCandidate = { name: string; size: number };

type UploadCheck =
  | { accepted: true; kind: ResourceFileKind }
  | {
      accepted: false;
      refusal: Extract<ResourceRefusal, "unsupported-type" | "too-large">;
    };

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");

  return dot < 0 ? "" : fileName.slice(dot + 1).toLocaleLowerCase();
}

export function checkResourceUpload(candidate: UploadCandidate): UploadCheck {
  const kind = KIND_BY_EXTENSION[extensionOf(candidate.name)];
  if (!kind) return { accepted: false, refusal: "unsupported-type" };
  if (candidate.size > MAX_RESOURCE_FILE_BYTES) {
    return { accepted: false, refusal: "too-large" };
  }

  return { accepted: true, kind };
}

export function titleFromFileName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const words = stem
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return words.charAt(0).toLocaleUpperCase() + words.slice(1);
}
