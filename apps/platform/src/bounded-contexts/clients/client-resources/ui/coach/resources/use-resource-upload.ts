import type {
  ResourceDetailsProblems,
  ResourceRefusal,
} from "@eli-coach-platform/domain/client-resources";
import { useUploadState } from "@eli-coach-platform/infrastructure/http";
import { useEffect, useEffectEvent, useRef } from "react";
import { useFetcher } from "react-router";

import {
  addedResourceAnswerSchema,
  refusedResourceAnswerSchema,
  resourceDetailsProblemsAnswerSchema,
} from "~/bounded-contexts/clients/client-resources/public/client-resources";
import { clientResourcesPath } from "~/bounded-contexts/clients/client-resources/public/paths";
import { RESOURCE_UPLOAD_PARTS } from "~/bounded-contexts/clients/client-resources/public/resource-upload-parts";
import { resourceUploadProgress } from "~/bounded-contexts/clients/client-resources/public/resource-upload-progress";

export type ResourceUploadOutcome =
  | { status: "added" }
  | { status: "refused"; refusal: ResourceRefusal }
  | { status: "details-refused"; problems: ResourceDetailsProblems }
  | { status: "failed" };

export type ResourceUploadRequest = {
  file: File;
  title: string;
  description: string;
  tags: readonly string[];
};

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
  request.tags.forEach((tag) => {
    formData.append(RESOURCE_UPLOAD_PARTS.tags, tag);
  });

  return formData;
}

export function useResourceUpload(
  clientId: string,
  onSettled: (outcome: ResourceUploadOutcome) => void,
) {
  const { data, state, submit } = useFetcher<unknown>();
  const awaitingAnswer = useRef(false);
  const uploadState = useUploadState(resourceUploadProgress, state);

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

  return { upload, uploadState };
}
