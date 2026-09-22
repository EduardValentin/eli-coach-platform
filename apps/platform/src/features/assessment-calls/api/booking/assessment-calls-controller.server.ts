import {
  ASSESSMENT_CALL_RULES,
  type BookAssessmentCallResult,
  type BookAssessmentCallUseCase,
  type JoinLinkResult,
  type ListOpenSlotsUseCase,
  type OpenSlotsResult,
  type ResolveJoinLinkUseCase,
} from "@eli-coach-platform/domain/assessment-call";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { FeatureFlagEvaluation } from "@eli-coach-platform/domain/feature-flag";
import type { BotVerifier } from "@eli-coach-platform/infrastructure/bot-detection/server";
import {
  ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION,
  TURNSTILE_RESPONSE_FIELD,
  type BotDetectionConfig,
} from "@eli-coach-platform/infrastructure/bot-detection";
import { resolveRequestRemoteIp } from "@eli-coach-platform/infrastructure/bot-detection/server";

import { resolveFieldErrorCode } from "~/features/assessment-calls/api/resolve-field-error-code";
import {
  bookAssessmentCallErrorSchema,
  bookAssessmentCallSuccessSchema,
  createBookAssessmentCallRequestSchema,
  openSlotsResponseSchema,
  phoneFromRequest,
  type BookAssessmentCallErrorCode,
  type OpenSlotsResponse,
} from "~/features/assessment-calls/contracts/assessment-calls";

export type BookingPageData =
  | ({ status: "open"; botDetection: BotDetectionConfig } & OpenSlotsResponse)
  | { status: "unavailable"; botDetection: BotDetectionConfig };

type AssessmentCallsControllerOptions = {
  botDetection: BotDetectionConfig;
  botVerifier: BotVerifier;
  bookAssessmentCall: BookAssessmentCallUseCase;
  clock: Clock;
  listOpenSlots: ListOpenSlotsUseCase;
  resolveJoinLink: ResolveJoinLinkUseCase;
};

type BookingErrorOptions = {
  code: BookAssessmentCallErrorCode;
  status: number;
};

const VALIDATION_ERROR_CODES = {
  country: "invalid_country",
  dateOfBirth: "invalid_date_of_birth",
  email: "invalid_email",
  firstName: "invalid_first_name",
  gender: "invalid_gender",
  lastName: "invalid_last_name",
  notes: "notes_too_long",
  phoneNumber: "invalid_phone",
  primaryGoal: "invalid_primary_goal",
  startsAt: "invalid_start",
  visitorTimeZone: "invalid_time_zone",
} as const satisfies Record<string, BookAssessmentCallErrorCode>;

const ERROR_MESSAGES = {
  booking_refused:
    "We couldn't book this call. Email us and we'll sort it out.",
  bot_verification_failed:
    "We could not confirm this request. Please try again.",
  invalid_country: "Please choose your country.",
  invalid_date_of_birth:
    "Please enter a date of birth that makes you at least 18.",
  invalid_email:
    "That email address doesn't look right. Check it and try again.",
  invalid_first_name: "Please enter your first name, up to 60 characters.",
  invalid_gender: "Please choose a gender option.",
  invalid_last_name: "Please enter your last name, up to 60 characters.",
  invalid_phone:
    "Please enter a phone number with digits only, 4 to 14 digits after the country code.",
  invalid_primary_goal: "Please choose your primary goal.",
  invalid_start: "Please choose an available time.",
  invalid_time_zone: "Please choose a known time zone.",
  notes_too_long: "Please keep your notes under 1000 characters.",
  server_error: "Something went wrong on our end. Please try again.",
  slot_unavailable:
    "That time was taken while you were filling in your details. Pick another one — your details are saved.",
} as const satisfies Record<BookAssessmentCallErrorCode, string>;

export class AssessmentCallsController {
  constructor(private readonly options: AssessmentCallsControllerOptions) {}

  async loadBookingPage(
    featureFlagEvaluation?: FeatureFlagEvaluation,
  ): Promise<BookingPageData> {
    const result = await this.options.listOpenSlots.execute(
      featureFlagEvaluation,
    );

    if (result.status === "closed") {
      throw createNotFoundResponse();
    }

    if (result.status === "unavailable") {
      return { botDetection: this.options.botDetection, status: "unavailable" };
    }

    return {
      botDetection: this.options.botDetection,
      status: "open",
      ...serialiseOpenSlots(result),
    };
  }

  async listSlots(
    featureFlagEvaluation?: FeatureFlagEvaluation,
  ): Promise<Response> {
    const result = await this.options.listOpenSlots.execute(
      featureFlagEvaluation,
    );

    if (result.status === "closed") {
      return createNotFoundResponse();
    }

    if (result.status === "unavailable") {
      return createBookingErrorResponse({ code: "server_error", status: 503 });
    }

    return Response.json(serialiseOpenSlots(result), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  async book(
    request: Request,
    featureFlagEvaluation?: FeatureFlagEvaluation,
  ): Promise<Response> {
    const formData = await request.formData();
    const submission = createBookAssessmentCallRequestSchema({
      now: this.options.clock.now(),
    }).safeParse({
      country: formData.get("country"),
      dateOfBirth: formData.get("dateOfBirth"),
      email: formData.get("email"),
      firstName: formData.get("firstName"),
      gender: formData.get("gender"),
      lastName: formData.get("lastName"),
      notes: readOptionalField(formData, "notes"),
      phoneCountry: readOptionalField(formData, "phoneCountry"),
      phoneNumber: readOptionalField(formData, "phoneNumber"),
      primaryGoal: formData.get("primaryGoal"),
      startsAt: formData.get("startsAt"),
      visitorTimeZone: formData.get("visitorTimeZone"),
    });

    if (!submission.success) {
      return createBookingErrorResponse({
        code: resolveFieldErrorCode(
          submission.error.issues,
          VALIDATION_ERROR_CODES,
          "server_error",
        ),
        status: 400,
      });
    }

    const verification = await this.options.botVerifier.verifySubmission({
      action: ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION,
      remoteIp: resolveRequestRemoteIp(request),
      token: readTurnstileToken(formData),
    });

    if (verification.status === "unavailable") {
      return createBookingErrorResponse({ code: "server_error", status: 500 });
    }

    if (verification.status === "rejected") {
      return createBookingErrorResponse({
        code: "bot_verification_failed",
        status: 400,
      });
    }

    try {
      const command = {
        country: submission.data.country,
        dateOfBirth: submission.data.dateOfBirth,
        email: submission.data.email,
        firstName: submission.data.firstName,
        gender: submission.data.gender,
        lastName: submission.data.lastName,
        notes: submission.data.notes ?? null,
        phone: phoneFromRequest(submission.data),
        primaryGoal: submission.data.primaryGoal,
        startsAt: new Date(submission.data.startsAt),
        visitorTimeZone: submission.data.visitorTimeZone,
      };
      const result = await this.options.bookAssessmentCall.execute(
        command,
        featureFlagEvaluation,
      );

      return createBookingResponse(result);
    } catch {
      console.error("Assessment call booking failed.", {
        errorCategory: "assessment_call_booking_failure",
      });

      return createBookingErrorResponse({ code: "server_error", status: 500 });
    }
  }

  async resolveJoin(bookingId: string): Promise<JoinLinkResult> {
    return this.options.resolveJoinLink.execute(bookingId);
  }
}

function serialiseOpenSlots(
  result: Extract<OpenSlotsResult, { status: "open" }>,
): OpenSlotsResponse {
  return openSlotsResponseSchema.parse({
    coachTimeZone: result.coachTimeZone,
    slots: result.slots.map((slot) => slot.toISOString()),
  });
}

function createBookingResponse(result: BookAssessmentCallResult): Response {
  if (result.status === "closed") {
    return createNotFoundResponse();
  }

  if (result.status === "slot_unavailable") {
    return createBookingErrorResponse({
      code: "slot_unavailable",
      status: 409,
    });
  }

  if (result.status === "email_already_booked") {
    return createBookingErrorResponse({ code: "booking_refused", status: 409 });
  }

  return Response.json(
    bookAssessmentCallSuccessSchema.parse({
      booking: {
        durationMinutes: ASSESSMENT_CALL_RULES.durationMinutes,
        id: result.call.id,
        startsAt: result.call.startsAt.toISOString(),
        visitorTimeZone: result.call.visitorTimeZone,
      },
      success: true,
    }),
    { status: 201 },
  );
}

function createBookingErrorResponse(options: BookingErrorOptions): Response {
  return Response.json(
    bookAssessmentCallErrorSchema.parse({
      error: {
        code: options.code,
        message: ERROR_MESSAGES[options.code],
      },
      success: false,
    }),
    { status: options.status },
  );
}

function createNotFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}

function readOptionalField(
  formData: FormData,
  field: string,
): string | undefined {
  const value = formData.get(field);

  return typeof value === "string" && value.trim() ? value : undefined;
}

function readTurnstileToken(formData: FormData): string | null {
  const token = formData.get(TURNSTILE_RESPONSE_FIELD);

  return typeof token === "string" && token.trim() ? token : null;
}
