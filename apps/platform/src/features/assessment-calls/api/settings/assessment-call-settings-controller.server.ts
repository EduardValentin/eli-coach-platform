import type {
  AssessmentCallSettingsProblem,
  AssessmentCallSettingsSnapshot,
  GetAssessmentCallSettingsUseCase,
  UpdateAssessmentCallSettingsResult,
  UpdateAssessmentCallSettingsUseCase,
} from "@eli-coach-platform/domain/assessment-call";
import type { ActionFunctionArgs } from "react-router";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import { resolveFieldErrorCode } from "~/features/assessment-calls/api/resolve-field-error-code";
import {
  ASSESSMENT_CALL_SETTINGS_MESSAGES,
  assessmentCallSettingsSchema,
  updateAssessmentCallSettingsErrorSchema,
  updateAssessmentCallSettingsSuccessSchema,
  type AssessmentCallSettings,
  type AssessmentCallSettingsErrorCode,
} from "~/features/assessment-calls/contracts/assessment-call-settings";

type AssessmentCallSettingsControllerOptions = {
  getSettings: GetAssessmentCallSettingsUseCase;
  updateSettings: UpdateAssessmentCallSettingsUseCase;
};

const FIELD_ERROR_CODES = {
  weekdays: "no_weekday",
  startHour: "invalid_hours",
  endHour: "invalid_hours",
  meetingLink: "invalid_meeting_link",
  timeZone: "invalid_time_zone",
} as const satisfies Record<string, AssessmentCallSettingsErrorCode>;

const PROBLEM_CODES_MATCH_WIRE_CODES = {
  no_weekday: "no_weekday",
  invalid_hours: "invalid_hours",
  invalid_time_zone: "invalid_time_zone",
  invalid_meeting_link: "invalid_meeting_link",
} as const satisfies Record<
  AssessmentCallSettingsProblem,
  AssessmentCallSettingsErrorCode
>;

export class AssessmentCallSettingsController {
  constructor(
    private readonly options: AssessmentCallSettingsControllerOptions,
  ) {}

  async loadSettingsPage(): Promise<AssessmentCallSettings> {
    // Named type keeps the domain's published result type referenced (knip).
    const snapshot: AssessmentCallSettingsSnapshot =
      await this.options.getSettings.execute();

    return assessmentCallSettingsSchema.parse(snapshot);
  }

  async updateSettings(args: ActionFunctionArgs): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });

    const body: unknown = await args.request.json();
    const submission = assessmentCallSettingsSchema.safeParse(body);

    if (!submission.success) {
      return createSettingsErrorResponse({
        code: resolveFieldErrorCode(
          submission.error.issues,
          FIELD_ERROR_CODES,
          "server_error",
        ),
        status: 400,
      });
    }

    try {
      // Named type keeps the domain's published result type referenced (knip).
      const result: UpdateAssessmentCallSettingsResult =
        await this.options.updateSettings.execute(submission.data);

      if (result.status === "invalid") {
        return createSettingsErrorResponse({
          code: firstProblemErrorCode(result.problems),
          status: 400,
        });
      }

      return Response.json(
        updateAssessmentCallSettingsSuccessSchema.parse({
          settings: result.settings,
          success: true,
        }),
      );
    } catch {
      console.error("Assessment call settings save failed.", {
        errorCategory: "assessment_call_settings_save_failure",
      });

      return createSettingsErrorResponse({ code: "server_error", status: 500 });
    }
  }
}

function createSettingsErrorResponse(options: {
  code: AssessmentCallSettingsErrorCode;
  status: number;
}): Response {
  return Response.json(
    updateAssessmentCallSettingsErrorSchema.parse({
      error: {
        code: options.code,
        message: ASSESSMENT_CALL_SETTINGS_MESSAGES[options.code],
      },
      success: false,
    }),
    { status: options.status },
  );
}

function firstProblemErrorCode(
  problems: readonly AssessmentCallSettingsProblem[],
): AssessmentCallSettingsErrorCode {
  const [firstProblem] = problems;

  return firstProblem
    ? PROBLEM_CODES_MATCH_WIRE_CODES[firstProblem]
    : "server_error";
}
