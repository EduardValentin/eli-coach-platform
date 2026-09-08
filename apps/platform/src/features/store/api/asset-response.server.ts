import { Readable } from "node:stream";

export function createStreamResponse(
  stream: NodeJS.ReadableStream,
  options: { contentLength?: number; filename: string; mimeType: string },
): Response {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    // Customer-supplied bytes: nothing a browser renders from them may
    // reach back into the origin serving them.
    "Content-Security-Policy": "sandbox; default-src 'none'",
    "Content-Disposition": createContentDisposition(options.filename),
    "Content-Type": options.mimeType,
    "X-Content-Type-Options": "nosniff",
  });

  if (options.contentLength !== undefined) {
    headers.set("Content-Length", String(options.contentLength));
  }

  return new Response(
    Readable.toWeb(stream as Readable) as ReadableStream<Uint8Array>,
    { headers },
  );
}

function createContentDisposition(filename: string): string {
  const safeFilename = filename
    .replace(/[\r\n"]/g, "")
    .replace(/[^\x20-\x7e]/g, "_");

  return `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(
    filename,
  )}`;
}
