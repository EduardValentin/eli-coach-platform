import type {
  ResourceDetailsProblems,
  ResourceRefusal,
} from "@eli-coach-platform/domain/client-resources";
import {
  IDLE_UPLOAD_PROGRESS,
  type UploadProgressSnapshot,
} from "@eli-coach-platform/infrastructure/http";
import { useEffect, useEffectEvent, useRef, useSyncExternalStore } from "react";
import { useFetcher, type Fetcher } from "react-router";

import {
  addedResourceAnswerSchema,
  refusedResourceAnswerSchema,
  resourceDetailsProblemsAnswerSchema,
} from "~/features/client-resources/contracts/client-resources";
import { clientResourcesPath } from "~/features/client-resources/contracts/paths";
import { RESOURCE_UPLOAD_PARTS } from "~/features/client-resources/contracts/resource-upload-parts";
import { resourceUploadProgress } from "~/features/client-resources/contracts/resource-upload-progress";

export type ResourceUploadState =
  | { state: "idle" }
  | { state: "sending"; fraction: number }
  | { state: "preparing" };

export type ResourceUploadOutcome =
  | { status: "added" }
  | { status: "refused"; refusal: ResourceRefusal }
  | { status: "details-refused"; problems: ResourceDetailsProblems }
  | { status: "failed" };

export type ResourceUploadRequest = {
  file: File;
  title: string;
  description: string;
};

const IDLE_UPLOAD: ResourceUploadState = { state: "idle" };

const PREPARING_UPLOAD: ResourceUploadState = { state: "preparing" };

function idleUploadProgress(): UploadProgressSnapshot {
  return IDLE_UPLOAD_PROGRESS;
}

function uploadStateOf(
  fetcherState: Fetcher["state"],
  progress: UploadProgressSnapshot,
): ResourceUploadState {
  if (fetcherState !== "submitting") return IDLE_UPLOAD;
  if (progress.phase === "sent") return PREPARING_UPLOAD;

  return {
    state: "sending",
    fraction: progress.phase === "sending" ? progress.fraction : 0,
  };
}

function outcomeOf(answer: unknown): ResourceUploadOutcome {
  if (addedResourceAnswerSchema.safeParse(answer).success) {
    return { status: "added" };
  }

  const refused = refusedResourceAnswerSchema.safeParse(answer);
  if (refused.success) {
    return { status: "refused", refusal: refused.data.refusal };
  }

  const detailsRefused = resourceDetailsProblemsAnswerSchema.safeParse(answer);
  if (detailsRefused.success) {
    return {
      status: "details-refused",
      problems: detailsRefused.data.problems,
    };
  }

  return { status: "failed" };
}

function uploadFormData(request: ResourceUploadRequest): FormData {
  const formData = new FormData();
  formData.append(RESOURCE_UPLOAD_PARTS.file, request.file);
  formData.append(RESOURCE_UPLOAD_PARTS.title, request.title);
  formData.append(RESOURCE_UPLOAD_PARTS.description, request.description);

  return formData;
}

export function useResourceUpload(
  clientId: string,
  onSettled: (outcome: ResourceUploadOutcome) => void,
) {
  const { data, state, submit } = useFetcher<unknown>();
  const awaitingAnswer = useRef(false);
  const progress = useSyncExternalStore(
    resourceUploadProgress.subscribe,
    resourceUploadProgress.getSnapshot,
    idleUploadProgress,
  );

  const settle = useEffectEvent((answer: unknown) => {
    awaitingAnswer.current = false;
    onSettled(outcomeOf(answer));
  });

  useEffect(() => {
    if (data !== undefined) {
      settle(data);
    }
  }, [data]);

  const upload = (request: ResourceUploadRequest) => {
    // The router commits the fetcher's busy state in a transition, after the upload has started.
    if (awaitingAnswer.current) return;

    awaitingAnswer.current = true;
    void submit(uploadFormData(request), {
      action: clientResourcesPath(clientId),
      encType: "multipart/form-data",
      method: "post",
    });
  };

  return { upload, uploadState: uploadStateOf(state, progress) };
}
