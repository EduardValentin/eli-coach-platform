import { joinBasePath } from "@eli-coach-platform/config";
import { useCallback, useMemo } from "react";
import { useFetcher } from "react-router";
import {
  bookAssessmentCallResponseSchema,
  openSlotsResponseSchema,
  type BookAssessmentCallResponse,
  type OpenSlotsResponse,
} from "~/features/assessment-calls/contracts/assessment-calls";
import { ASSESSMENT_CALL_API_PATHS } from "~/features/assessment-calls/contracts/paths";

export const SLOTS_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  ASSESSMENT_CALL_API_PATHS.slots,
);

export const BOOKINGS_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  ASSESSMENT_CALL_API_PATHS.bookings,
);

export function useBookAssessmentCallFetcher() {
  const fetcher = useFetcher<unknown>();
  const { data, state, submit: fetcherSubmit } = fetcher;
  const isSubmitting = state === "submitting";
  const parsedResponse = useMemo(
    () => (data === undefined ? null : parseBookingResponse(data)),
    [data],
  );
  const submit = useCallback(
    (formData: FormData) => {
      void fetcherSubmit(formData, {
        action: ASSESSMENT_CALL_API_PATHS.bookings,
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

export function useRefreshSlotsFetcher() {
  const fetcher = useFetcher<unknown>();
  const { data, load } = fetcher;
  const openSlots = useMemo(() => parseOpenSlots(data), [data]);
  const refresh = useCallback(() => {
    void load(ASSESSMENT_CALL_API_PATHS.slots);
  }, [load]);

  return { openSlots, refresh };
}

function parseBookingResponse(data: unknown): BookAssessmentCallResponse {
  const result = bookAssessmentCallResponseSchema.safeParse(data);

  return result.success
    ? result.data
    : {
        error: {
          code: "server_error",
          message: "Something went wrong on our end. Please try again.",
        },
        success: false,
      };
}

function parseOpenSlots(data: unknown): OpenSlotsResponse | null {
  if (data === undefined) {
    return null;
  }

  const result = openSlotsResponseSchema.safeParse(data);

  return result.success ? result.data : null;
}
