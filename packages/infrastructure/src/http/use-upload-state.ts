import { useSyncExternalStore } from "react";

import {
  IDLE_UPLOAD_PROGRESS,
  type UploadProgress,
  type UploadProgressSnapshot,
} from "./upload-progress";

export type UploadState =
  | { state: "idle" }
  | { state: "sending"; fraction: number }
  | { state: "preparing" };

type FetcherState = "idle" | "submitting" | "loading";

const IDLE_UPLOAD: UploadState = { state: "idle" };

const PREPARING_UPLOAD: UploadState = { state: "preparing" };

function idleUploadProgress(): UploadProgressSnapshot {
  return IDLE_UPLOAD_PROGRESS;
}

function uploadStateOf(
  fetcherState: FetcherState,
  progress: UploadProgressSnapshot,
): UploadState {
  if (fetcherState !== "submitting") return IDLE_UPLOAD;
  if (progress.phase === "sent") return PREPARING_UPLOAD;

  return {
    state: "sending",
    fraction: progress.phase === "sending" ? progress.fraction : 0,
  };
}

export function useUploadState(
  progress: UploadProgress,
  fetcherState: FetcherState,
): UploadState {
  const snapshot = useSyncExternalStore(
    progress.subscribe,
    progress.getSnapshot,
    idleUploadProgress,
  );

  return uploadStateOf(fetcherState, snapshot);
}
