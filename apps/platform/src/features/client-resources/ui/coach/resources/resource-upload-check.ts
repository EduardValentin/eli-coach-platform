import {
  MAX_RESOURCE_FILE_BYTES,
  RESOURCE_FILE_EXTENSIONS,
  resourceFileKindOfExtension,
  type ResourceFileKind,
  type ResourceRefusal,
} from "@eli-coach-platform/domain/client-resources";

export const RESOURCE_UPLOAD_ACCEPT = RESOURCE_FILE_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(",");

type UploadCandidate = { name: string; size: number };

type UploadCheck =
  | { accepted: true; kind: ResourceFileKind }
  | {
      accepted: false;
      refusal: Extract<ResourceRefusal, "unsupported-type" | "too-large">;
    };

type FileNameParts = { stem: string; extension: string };

function fileNameParts(fileName: string): FileNameParts {
  const dot = fileName.lastIndexOf(".");

  if (dot <= 0) return { stem: fileName, extension: "" };

  return { stem: fileName.slice(0, dot), extension: fileName.slice(dot + 1) };
}

function extensionOf(fileName: string): string {
  return fileNameParts(fileName).extension.toLocaleLowerCase();
}

export function checkResourceUpload(candidate: UploadCandidate): UploadCheck {
  const kind = resourceFileKindOfExtension(extensionOf(candidate.name));
  if (!kind) return { accepted: false, refusal: "unsupported-type" };
  if (candidate.size > MAX_RESOURCE_FILE_BYTES) {
    return { accepted: false, refusal: "too-large" };
  }

  return { accepted: true, kind };
}

export function titleFromFileName(fileName: string): string {
  const words = fileNameParts(fileName)
    .stem.replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return words.charAt(0).toLocaleUpperCase() + words.slice(1);
}
