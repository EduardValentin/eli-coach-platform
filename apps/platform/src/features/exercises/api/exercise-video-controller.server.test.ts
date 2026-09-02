import { Readable } from "node:stream";
import { RouterContextProvider, type LoaderFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { ExerciseLibraryService, RangeFileReader } from "@eli-coach-platform/domain";
import { accountContext } from "~/features/accounts/server/account-context.server";

import {
  ExerciseVideoController,
  resolveByteRange,
} from "./exercise-video-controller.server";

const video = {
  assetKey: "exercise-videos/abc.mp4",
  mimeType: "video/mp4",
  sizeBytes: 10,
  sha256: "a".repeat(64),
};

function coachArgs(
  headers: Record<string, string> = {},
  method = "GET",
): LoaderFunctionArgs {
  const context = new RouterContextProvider();

  context.set(accountContext, {
    kind: "authenticated",
    account: { id: "acct", authSubjectId: "user_1", role: "COACH", deletedAt: null },
  });

  return {
    context,
    params: {},
    request: new Request("https://eli.example/api/exercises/videos/x", {
      headers,
      method,
    }),
  } as unknown as LoaderFunctionArgs;
}

function createController(
  status: "available" | "not_found",
  open = vi.fn().mockResolvedValue(Readable.from([Buffer.from("0123456789")])),
) {
  const service = {
    getVideoByAssetKey: vi
      .fn()
      .mockResolvedValue(status === "available" ? { status, video } : { status }),
  } as unknown as ExerciseLibraryService;
  const videoStore = { open } satisfies RangeFileReader;

  return { controller: new ExerciseVideoController({ service, videoStore }), open };
}

describe("resolveByteRange", () => {
  it.each([
    [null, { status: "entire" }],
    ["bytes=0-3", { status: "partial", range: { start: 0, end: 3 } }],
    ["bytes=4-", { status: "partial", range: { start: 4, end: 9 } }],
    ["bytes=-3", { status: "partial", range: { start: 7, end: 9 } }],
    ["bytes=0-99", { status: "partial", range: { start: 0, end: 9 } }],
    ["bytes=10-", { status: "unsatisfiable" }],
    ["bytes=5-2", { status: "unsatisfiable" }],
    ["bytes=0-1,3-4", { status: "entire" }],
    ["items=0-1", { status: "entire" }],
  ])("resolves %s against a 10-byte file", (header, expected) => {
    // arrange, act, assert
    expect(resolveByteRange(header, 10)).toEqual(expected);
  });
});

describe("ExerciseVideoController", () => {
  it("streams the whole video with range advertising and private caching", async () => {
    // arrange
    const { controller } = createController("available");

    // act
    const response = await controller.getVideo(coachArgs(), video.assetKey);

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(response.headers.get("Content-Type")).toBe("video/mp4");
    expect(response.headers.get("Content-Length")).toBe("10");
    expect(response.headers.get("Cache-Control")).toContain("private");
    await expect(response.text()).resolves.toBe("0123456789");
  });

  it("answers a byte range with 206 and passes the range to the store", async () => {
    // arrange
    const { controller, open } = createController(
      "available",
      vi.fn().mockResolvedValue(Readable.from([Buffer.from("2345")])),
    );

    // act
    const response = await controller.getVideo(
      coachArgs({ range: "bytes=2-5" }),
      video.assetKey,
    );

    // assert
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 2-5/10");
    expect(response.headers.get("Content-Length")).toBe("4");
    expect(open).toHaveBeenCalledWith(video, { start: 2, end: 5 });
  });

  it("answers 416 to an unsatisfiable range, 404 to an unknown key, and headers only to HEAD", async () => {
    // arrange
    const { controller, open } = createController("available");
    const { controller: missing } = createController("not_found");

    // act
    const unsatisfiable = await controller.getVideo(
      coachArgs({ range: "bytes=50-" }),
      video.assetKey,
    );
    const notFound = await missing.getVideo(coachArgs(), "covers/x.png");
    const head = await controller.getVideo(coachArgs({}, "HEAD"), video.assetKey);

    // assert
    expect(unsatisfiable.status).toBe(416);
    expect(unsatisfiable.headers.get("Content-Range")).toBe("bytes */10");
    expect(notFound.status).toBe(404);
    expect(head.status).toBe(200);
    expect(head.body).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });

  it("refuses callers without a coach session", async () => {
    // arrange
    const { controller, open } = createController("available");
    const context = new RouterContextProvider();
    context.set(accountContext, { kind: "anonymous" });
    const args = {
      context,
      params: {},
      request: new Request("https://eli.example/api/exercises/videos/x"),
    } as unknown as LoaderFunctionArgs;

    // act
    const denied = controller.getVideo(args, video.assetKey);

    // assert
    await expect(denied).rejects.toMatchObject({ status: 401 });
    expect(open).not.toHaveBeenCalled();
  });
});
