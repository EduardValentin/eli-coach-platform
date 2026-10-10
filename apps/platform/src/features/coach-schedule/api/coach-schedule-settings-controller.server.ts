import type {
  CoachScheduleSettingsProblem,
  GetCoachScheduleSettingsUseCase,
  UpdateCoachScheduleSettingsUseCase,
} from "@eli-coach-platform/domain/coach-schedule";
import { resolveFieldErrorCode } from "@eli-coach-platform/infrastructure/http/server";
import type { ActionFunctionArgs } from "react-router";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import {
  COACH_SCHEDULE_SETTINGS_MESSAGES,
  coachScheduleSettingsSchema,
  updateCoachScheduleSettingsErrorSchema,
  updateCoachScheduleSettingsSuccessSchema,
  type CoachScheduleSettings,
  type CoachScheduleSettingsErrorCode,
} from "~/features/coach-schedule/public/coach-schedule-settings";

type CoachScheduleSettingsControllerOptions = {
  getSettings: GetCoachScheduleSettingsUseCase;
  updateSettings: UpdateCoachScheduleSettingsUseCase;
};

const FIELD_ERROR_CODES = {
  weekdays: "no_weekday",
  startHour: "invalid_hours",
  endHour: "invalid_hours",
  meetingLink: "invalid_meeting_link",
  timeZone: "invalid_time_zone",
} as const satisfies Record<string, CoachScheduleSettingsErrorCode>;

const PROBLEM_CODES_MATCH_WIRE_CODES = {
  no_weekday: "no_weekday",
  invalid_hours: "invalid_hours",
  invalid_time_zone: "invalid_time_zone",
  invalid_meeting_link: "invalid_meeting_link",
} as const satisfies Record<
  CoachScheduleSettingsProblem,
  CoachScheduleSettingsErrorCode
>;

export class CoachScheduleSettingsController {
  constructor(
    private readonly options: CoachScheduleSettingsControllerOptions,
  ) {}

  async loadSettingsPage(): Promise<CoachScheduleSettings> {
    return coachScheduleSettingsSchema.parse(
      await this.options.getSettings.execute(),
    );
  }

  async updateSettings(args: ActionFunctionArgs): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });

    const body: unknown = await args.request.json();
    const submission = coachScheduleSettingsSchema.safeParse(body);

    if (!submission.success) {
      return this.createSettingsErrorResponse({
        code: resolveFieldErrorCode(
          submission.error.issues,
          FIELD_ERROR_CODES,
          "server_error",
        ),
        status: 400,
      });
    }

    try {
      const result = await this.options.updateSettings.execute(submission.data);

      if (result.status === "invalid") {
        return this.createSettingsErrorResponse({
          code: this.firstProblemErrorCode(result.problems),
          status: 400,
        });
      }

      return Response.json(
        updateCoachScheduleSettingsSuccessSchema.parse({
          settings: result.settings,
          success: true,
        }),
      );
    } catch {
      console.error("Coach schedule settings save failed.", {
        errorCategory: "coach_schedule_settings_save_failure",
      });

      return this.createSettingsErrorResponse({
        code: "server_error",
        status: 500,
      });
    }
  }

  private createSettingsErrorResponse(options: {
    code: CoachScheduleSettingsErrorCode;
    status: number;
  }): Response {
    return Response.json(
      updateCoachScheduleSettingsErrorSchema.parse({
        error: {
          code: options.code,
          message: COACH_SCHEDULE_SETTINGS_MESSAGES[options.code],
        },
        success: false,
      }),
      { status: options.status },
    );
  }

  private firstProblemErrorCode(
    problems: readonly CoachScheduleSettingsProblem[],
  ): CoachScheduleSettingsErrorCode {
    const [firstProblem] = problems;

    return firstProblem
      ? PROBLEM_CODES_MATCH_WIRE_CODES[firstProblem]
      : "server_error";
  }
}
