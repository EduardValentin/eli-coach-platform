import { useCallback, useMemo } from "react";
import { useFetcher } from "react-router";

import {
  ASSESSMENT_CALL_SETTINGS_MESSAGES,
  updateAssessmentCallSettingsErrorSchema,
  updateAssessmentCallSettingsSuccessSchema,
  type AssessmentCallSettings,
  type AssessmentCallSettingsErrorCode,
} from "~/features/coach-schedule/public/assessment-call-settings";
import { COACH_SETTINGS_API_PATH } from "~/features/coach-schedule/public/paths";

export type SaveAssessmentCallSettingsResponse =
  | { settings: AssessmentCallSettings; success: true }
  | {
      error: { code: AssessmentCallSettingsErrorCode; message: string };
      success: false;
    };

export function useSaveAssessmentCallSettingsFetcher() {
  const fetcher = useFetcher<unknown>();
  const { data, state, submit: fetcherSubmit } = fetcher;
  const isSubmitting = state === "submitting";
  const response = useMemo(
    () =>
      isSubmitting || data === undefined ? null : parseSettingsResponse(data),
    [data, isSubmitting],
  );
  const submit = useCallback(
    (settings: AssessmentCallSettings) => {
      void fetcherSubmit(settings, {
        action: COACH_SETTINGS_API_PATH,
        encType: "application/json",
        method: "put",
      });
    },
    [fetcherSubmit],
  );

  return { isSubmitting, response, submit };
}

function parseSettingsResponse(
  data: unknown,
): SaveAssessmentCallSettingsResponse {
  const success = updateAssessmentCallSettingsSuccessSchema.safeParse(data);

  if (success.success) {
    return success.data;
  }

  const failure = updateAssessmentCallSettingsErrorSchema.safeParse(data);

  return failure.success
    ? failure.data
    : {
        error: {
          code: "server_error",
          message: ASSESSMENT_CALL_SETTINGS_MESSAGES.server_error,
        },
        success: false,
      };
}
