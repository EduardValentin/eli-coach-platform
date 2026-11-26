import { appUrl } from "~/shared/http/base-path";
import { useCallback, useMemo } from "react";
import { useFetcher } from "react-router";
import { WAITLIST_API_PATH } from "~/bounded-contexts/sales/waitlist/public/paths";
import {
  waitlistJoinResponseSchema,
  type WaitlistJoinResponse,
} from "~/bounded-contexts/sales/waitlist/public/waitlist";

import { createWaitlistServerErrorResponse } from "./errors";

export { WAITLIST_API_PATH };
export function waitlistApiUrl(): string {
  return appUrl(WAITLIST_API_PATH);
}

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
      void fetcherSubmit(formData, {
        action: WAITLIST_API_PATH,
        method: "post",
      });
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
