import { basename } from "node:path";
import { ReadableStream as NodeReadableStream } from "node:stream/web";

type FileBytes = AsyncIterable<Uint8Array> | Iterable<Uint8Array>;

type AttachmentOptions = {
  sizeBytes?: number;
  filename: string;
  mimeType: string;
};

const SANDBOX_POLICY = "sandbox; default-src 'none'";

const PRIVATE_FILE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
} as const;

function streamOf(bytes: FileBytes): ReadableStream<Uint8Array> {
  return NodeReadableStream.from(bytes) as ReadableStream<Uint8Array>;
}

function quotedFilenameOf(filename: string): string {
  return filename.replace(/[\r\n"\\/]/g, "").replace(/[^\x20-\x7e]/g, "_");
}

function encodedFilenameOf(filename: string): string {
  return encodeURIComponent(filename).replace(
    /['()*!]/g,
    (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  );
}

function createContentDisposition(filename: string): string {
  const offered = basename(filename);

  return `attachment; filename="${quotedFilenameOf(offered)}"; filename*=UTF-8''${encodedFilenameOf(offered)}`;
}

function attachmentHeaders(options: AttachmentOptions): Record<string, string> {
  const headers: Record<string, string> = {
    ...PRIVATE_FILE_HEADERS,
    "Content-Disposition": createContentDisposition(options.filename),
    "Content-Type": options.mimeType,
  };

  if (options.sizeBytes !== undefined) {
    headers["Content-Length"] = String(options.sizeBytes);
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
      ...PRIVATE_FILE_HEADERS,
      "Content-Length": String(bytes.byteLength),
      "Content-Security-Policy": SANDBOX_POLICY,
      "Content-Type": mimeType,
    },
  });
}
