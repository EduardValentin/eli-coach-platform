import { Readable } from "node:stream";

const CUSTOMER_ASSET_SANDBOX_CSP = "sandbox; default-src 'none'";

export function createStreamResponse(
  stream: NodeJS.ReadableStream,
  options: { contentLength?: number; filename: string; mimeType: string },
): Response {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Security-Policy": CUSTOMER_ASSET_SANDBOX_CSP,
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
