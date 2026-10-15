// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  beginUpload,
  createUploadProgress,
  endUpload,
  reportAllBytesSent,
  reportBytesSent,
  type UploadProgress,
} from "./upload-progress";
import { useUploadState } from "./use-upload-state";

type FetcherState = "idle" | "submitting" | "loading";

afterEach(() => {
  cleanup();
});

function renderUploadState(
  progress: UploadProgress,
  fetcherState: FetcherState,
) {
  return renderHook(
    ({ state }: { state: FetcherState }) => useUploadState(progress, state),
    { initialProps: { state: fetcherState } },
  );
}

describe("the upload state", () => {
  it("is idle while the fetcher is idle, whatever the progress says", () => {
    // arrange
    const progress = createUploadProgress();
    beginUpload(progress);
    reportBytesSent(progress, 0.5);

    // act
    const { result } = renderUploadState(progress, "idle");

    // assert
    expect(result.current).toEqual({ state: "idle" });
  });

  it("is idle while the fetcher reloads after the answer", () => {
    // arrange
    const progress = createUploadProgress();
    reportAllBytesSent(progress);

    // act
    const { result } = renderUploadState(progress, "loading");

    // assert
    expect(result.current).toEqual({ state: "idle" });
  });

  it("sends from nothing before the first byte is reported", () => {
    // arrange
    const progress = createUploadProgress();

    // act
    const { result } = renderUploadState(progress, "submitting");

    // assert
    expect(result.current).toEqual({ state: "sending", fraction: 0 });
  });

  it("follows the sent fraction as the bytes leave", () => {
    // arrange
    const progress = createUploadProgress();
    const { result } = renderUploadState(progress, "submitting");

    // act
    act(() => {
      beginUpload(progress);
      reportBytesSent(progress, 0.42);
    });

    // assert
    expect(result.current).toEqual({ state: "sending", fraction: 0.42 });
  });

  it("is preparing once every byte is sent and the server has not answered", () => {
    // arrange
    const progress = createUploadProgress();
    const { result } = renderUploadState(progress, "submitting");

    // act
    act(() => {
      reportAllBytesSent(progress);
    });

    // assert
    expect(result.current).toEqual({ state: "preparing" });
  });

  it("sends from nothing again once the upload has ended", () => {
    // arrange
    const progress = createUploadProgress();
    const { result } = renderUploadState(progress, "submitting");
    act(() => {
      reportAllBytesSent(progress);
    });

    // act
    act(() => {
      endUpload(progress);
    });

    // assert
    expect(result.current).toEqual({ state: "sending", fraction: 0 });
  });
});
