import type { ServedByteRange } from "@eli-coach-platform/domain/exercise";

import { streamOf } from "./file-byte-stream.server";

type PrivateMedia =
  | {
      status: "opened";
      mediaType: string;
      bytes: AsyncIterable<Uint8Array>;
      sizeBytes: number;
      served: ServedByteRange | "whole";
    }
  | { status: "unsatisfiable"; sizeBytes: number };

const PRIVATE_MEDIA_HEADERS = {
  "Accept-Ranges": "bytes",
  "Cache-Control": "private, max-age=31536000, immutable",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
} as const;

export function createPrivateMediaResponse(media: PrivateMedia): Response {
  if (media.status === "unsatisfiable") {
    return new Response(null, {
      headers: {
        ...PRIVATE_MEDIA_HEADERS,
        "Content-Range": `bytes */${media.sizeBytes}`,
      },
      status: 416,
    });
  }

  const headers = {
    ...PRIVATE_MEDIA_HEADERS,
    "Content-Type": media.mediaType,
  };

  if (media.served === "whole") {
    return new Response(streamOf(media.bytes), {
      headers: { ...headers, "Content-Length": String(media.sizeBytes) },
      status: 200,
    });
  }

  const { start, end } = media.served;

  return new Response(streamOf(media.bytes), {
    headers: {
      ...headers,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${media.sizeBytes}`,
    },
    status: 206,
  });
}
