import { useCallback, useMemo } from "react";
import { useFetcher } from "react-router";

import {
  COACH_SCHEDULE_SETTINGS_MESSAGES,
  updateCoachScheduleSettingsErrorSchema,
  updateCoachScheduleSettingsSuccessSchema,
  type CoachScheduleSettings,
  type CoachScheduleSettingsErrorCode,
} from "~/features/coach-schedule/public/coach-schedule-settings";
import { COACH_SETTINGS_API_PATH } from "~/features/coach-schedule/public/paths";

export type SaveCoachScheduleSettingsResponse =
  | { settings: CoachScheduleSettings; success: true }
  | {
      error: { code: CoachScheduleSettingsErrorCode; message: string };
      success: false;
    };

export function useSaveCoachScheduleSettingsFetcher() {
  const fetcher = useFetcher<unknown>();
  const { data, state, submit: fetcherSubmit } = fetcher;
  const isSubmitting = state === "submitting";
  const response = useMemo(
    () =>
      isSubmitting || data === undefined ? null : parseSettingsResponse(data),
    [data, isSubmitting],
  );
  const submit = useCallback(
    (settings: CoachScheduleSettings) => {
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
): SaveCoachScheduleSettingsResponse {
  const success = updateCoachScheduleSettingsSuccessSchema.safeParse(data);

  if (success.success) {
    return success.data;
  }

  const failure = updateCoachScheduleSettingsErrorSchema.safeParse(data);

  return failure.success
    ? failure.data
    : {
        error: {
          code: "server_error",
          message: COACH_SCHEDULE_SETTINGS_MESSAGES.server_error,
        },
        success: false,
      };
}
