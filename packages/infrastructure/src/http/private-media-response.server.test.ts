import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

import { createPrivateMediaResponse } from "./private-media-response.server";

const MEDIA_HEADERS = {
  "accept-ranges": "bytes",
  "cache-control": "private, max-age=31536000, immutable",
  "cross-origin-resource-policy": "same-origin",
  "x-content-type-options": "nosniff",
};

function storedBytes(...chunks: string[]): AsyncIterable<Uint8Array> {
  return Readable.from(chunks.map((chunk) => Buffer.from(chunk)));
}

function headersOf(response: Response): Record<string, string> {
  return Object.fromEntries(response.headers.entries());
}

describe("createPrivateMediaResponse", () => {
  it("streams the whole video with its length when no slice was served", async () => {
    // arrange
    const media = {
      status: "opened" as const,
      mediaType: "video/mp4",
      bytes: storedBytes("squat ", "demo"),
      sizeBytes: 10,
      served: "whole" as const,
    };

    // act
    const response = createPrivateMediaResponse(media);

    // assert
    expect(response.status).toBe(200);
    expect(headersOf(response)).toEqual({
      ...MEDIA_HEADERS,
      "content-length": "10",
      "content-type": "video/mp4",
    });
    await expect(response.text()).resolves.toBe("squat demo");
  });

  it("answers a served slice as partial content naming its place in the video", async () => {
    // arrange
    const media = {
      status: "opened" as const,
      mediaType: "video/webm",
      bytes: storedBytes("demo"),
      sizeBytes: 10,
      served: { start: 6, end: 9 },
    };

    // act
    const response = createPrivateMediaResponse(media);

    // assert
    expect(response.status).toBe(206);
    expect(headersOf(response)).toEqual({
      ...MEDIA_HEADERS,
      "content-length": "4",
      "content-range": "bytes 6-9/10",
      "content-type": "video/webm",
    });
    await expect(response.text()).resolves.toBe("demo");
  });

  it("answers a range past the video as unsatisfiable with no body", async () => {
    // arrange
    const media = { status: "unsatisfiable" as const, sizeBytes: 10 };

    // act
    const response = createPrivateMediaResponse(media);

    // assert
    expect(response.status).toBe(416);
    expect(headersOf(response)).toEqual({
      ...MEDIA_HEADERS,
      "content-range": "bytes */10",
    });
    expect(response.body).toBeNull();
  });
});
