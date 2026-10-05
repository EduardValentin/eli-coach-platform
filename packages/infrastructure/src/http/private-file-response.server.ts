import { basename } from "node:path";
import { Readable } from "node:stream";

type FileBytes = AsyncIterable<Uint8Array> | Iterable<Uint8Array>;

type AttachmentOptions = {
  byteLength?: number;
  filename: string;
  mimeType: string;
};

const SANDBOX_POLICY = "sandbox; default-src 'none'";

function streamOf(bytes: FileBytes): ReadableStream<Uint8Array> {
  return Readable.toWeb(Readable.from(bytes)) as ReadableStream<Uint8Array>;
}

function createContentDisposition(path: string): string {
  const filename = basename(path);
  const safeFilename = filename
    .replace(/[\r\n"]/g, "")
    .replace(/[^\x20-\x7e]/g, "_");

  return `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(
    filename,
  )}`;
}

function attachmentHeaders(options: AttachmentOptions): Record<string, string> {
  const headers: Record<string, string> = {
    "Cache-Control": "private, no-store",
    "Content-Disposition": createContentDisposition(options.filename),
    "Content-Type": options.mimeType,
    "X-Content-Type-Options": "nosniff",
  };

  if (options.byteLength !== undefined) {
    headers["Content-Length"] = String(options.byteLength);
  }

  return headers;
}

export function createAttachmentResponse(
  bytes: FileBytes,
  options: AttachmentOptions,
): Response {
  return new Response(streamOf(bytes), {
    headers: attachmentHeaders(options),
  });
}

export function createSandboxedAttachmentResponse(
  bytes: FileBytes,
  options: AttachmentOptions,
): Response {
  return new Response(streamOf(bytes), {
    headers: {
      ...attachmentHeaders(options),
      "Content-Security-Policy": SANDBOX_POLICY,
    },
  });
}

export function createPrivateInlineFileResponse(
  bytes: Uint8Array,
  mimeType: string,
): Response {
  return new Response(streamOf([bytes]), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Length": String(bytes.byteLength),
      "Content-Security-Policy": SANDBOX_POLICY,
      "Content-Type": mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
