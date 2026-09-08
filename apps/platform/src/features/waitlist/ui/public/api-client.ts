import { joinBasePath } from "@eli-coach-platform/config";
import { useCallback, useMemo } from "react";
import { useFetcher } from "react-router";
import {
  waitlistJoinResponseSchema,
  type WaitlistJoinResponse,
} from "~/features/waitlist/contracts/waitlist";

import { createWaitlistServerErrorResponse } from "./errors";

export const WAITLIST_API_PATH = "/api/waitlist";
export const WAITLIST_API_URL = joinBasePath(import.meta.env.BASE_URL, WAITLIST_API_PATH);

export function useJoinWaitlistFetcher() {
  const fetcher = useFetcher<unknown>();
  const { data, state, submit: fetcherSubmit } = fetcher;
  const isSubmitting = state === "submitting";
  const parsedResponse = useMemo(
    () => (data === undefined ? null : parseWaitlistJoinResponse(data)),
    [data],
  );
  const submit = useCallback(
    (formData: FormData) => {
      void fetcherSubmit(formData, { action: WAITLIST_API_PATH, method: "post" });
    },
    [fetcherSubmit],
  );

  return {
    isSubmitting,
    response: isSubmitting ? null : parsedResponse,
    submit,
  };
}

function parseWaitlistJoinResponse(data: unknown): WaitlistJoinResponse {
  const result = waitlistJoinResponseSchema.safeParse(data);

  return result.success ? result.data : createWaitlistServerErrorResponse();
}
