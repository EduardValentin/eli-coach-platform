import { Readable } from "node:stream";

import {
  EXERCISE_VIDEO_MIME_TYPE,
  type ExerciseLibraryService,
  type RangeFileReader,
  type StoredFileByteRange,
} from "@eli-coach-platform/domain";
import type { LoaderFunctionArgs } from "react-router";

import { requireApiAccount } from "~/features/accounts/server/require-account.server";

export type ByteRangeResolution =
  | { status: "entire" }
  | { status: "partial"; range: StoredFileByteRange }
  | { status: "unsatisfiable" };

const SINGLE_RANGE_PATTERN = /^bytes=(\d*)-(\d*)$/;
const UNAVAILABLE_MESSAGE = "Exercise video unavailable";

/** One `bytes=` range as RFC 9110 states it; anything else is served whole. */
export function resolveByteRange(
  header: string | null,
  sizeBytes: number,
): ByteRangeResolution {
  const match = header ? SINGLE_RANGE_PATTERN.exec(header.trim()) : null;

  if (!match) {
    return { status: "entire" };
  }

  const [, startText = "", endText = ""] = match;

  if (startText === "" && endText === "") {
    return { status: "entire" };
  }

  if (sizeBytes === 0) {
    return { status: "unsatisfiable" };
  }

  if (startText === "") {
    const suffixLength = Number(endText);

    return suffixLength === 0
      ? { status: "unsatisfiable" }
      : {
          status: "partial",
          range: { start: Math.max(sizeBytes - suffixLength, 0), end: sizeBytes - 1 },
        };
  }

  const start = Number(startText);
  const end = endText === "" ? sizeBytes - 1 : Math.min(Number(endText), sizeBytes - 1);

  if (start >= sizeBytes || end < start) {
    return { status: "unsatisfiable" };
  }

  return { status: "partial", range: { start, end } };
}

type ExerciseVideoControllerOptions = {
  service: ExerciseLibraryService;
  videoStore: RangeFileReader;
};

export class ExerciseVideoController {
  constructor(private readonly options: ExerciseVideoControllerOptions) {}

  async getVideo(
    args: LoaderFunctionArgs,
    assetKeyParameter: string | undefined,
  ): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });

    if (!assetKeyParameter) {
      return new Response("Not Found", { status: 404 });
    }

    // Only a key an exercise currently carries is served, so nothing else
    // under the shared asset root — store covers or downloads — is reachable
    // through this route.
    const result = await this.options.service.getVideoByAssetKey(assetKeyParameter);

    if (result.status === "not_found") {
      return new Response("Not Found", { status: 404 });
    }

    if (result.status === "unavailable") {
      return new Response(UNAVAILABLE_MESSAGE, { status: 503 });
    }

    const { video } = result;
    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "Content-Type": EXERCISE_VIDEO_MIME_TYPE,
      "X-Content-Type-Options": "nosniff",
    });
    const resolution = resolveByteRange(
      args.request.headers.get("Range"),
      video.sizeBytes,
    );

    if (resolution.status === "unsatisfiable") {
      headers.set("Content-Range", `bytes */${video.sizeBytes}`);

      return new Response(null, { headers, status: 416 });
    }

    const range = resolution.status === "partial" ? resolution.range : null;

    headers.set(
      "Content-Length",
      String(range ? range.end - range.start + 1 : video.sizeBytes),
    );

    if (range) {
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${video.sizeBytes}`);
    }

    const status = range ? 206 : 200;

    if (args.request.method === "HEAD") {
      return new Response(null, { headers, status });
    }

    let stream: NodeJS.ReadableStream;

    try {
      stream = await this.options.videoStore.open(video, range ?? undefined);
    } catch {
      return new Response(UNAVAILABLE_MESSAGE, { status: 503 });
    }

    return new Response(
      Readable.toWeb(stream as Readable) as ReadableStream<Uint8Array>,
      { headers, status },
    );
  }
}
