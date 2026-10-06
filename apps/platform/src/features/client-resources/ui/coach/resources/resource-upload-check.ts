import {
  fileNameParts,
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

export function checkResourceUpload(candidate: UploadCandidate): UploadCheck {
  const kind = resourceFileKindOfExtension(
    fileNameParts(candidate.name).extension,
  );
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
