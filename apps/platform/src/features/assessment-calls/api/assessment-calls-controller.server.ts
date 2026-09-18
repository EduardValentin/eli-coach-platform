import type {
  AssessmentCallSnapshot,
  BookAssessmentCallResult,
  BookAssessmentCallUseCase,
  JoinLinkResult,
  ListOpenSlotsUseCase,
  OpenSlotsResult,
  ResolveJoinLinkUseCase,
} from "@eli-coach-platform/domain/assessment-call";
import { ASSESSMENT_CALL_RULES } from "@eli-coach-platform/domain/coach-availability";
import type { BotVerifier } from "@eli-coach-platform/domain/shared";
import {
  ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION,
  TURNSTILE_RESPONSE_FIELD,
  type BotDetectionConfig,
} from "@eli-coach-platform/infrastructure/bot-detection";
import { resolveRequestRemoteIp } from "@eli-coach-platform/infrastructure/bot-detection/server";

import {
  bookAssessmentCallErrorSchema,
  bookAssessmentCallRequestSchema,
  bookAssessmentCallSuccessSchema,
  openSlotsResponseSchema,
  type BookAssessmentCallErrorCode,
  type OpenSlotsResponse,
} from "~/features/assessment-calls/contracts/assessment-calls";
import { assessmentCallJoinPath } from "~/features/assessment-calls/contracts/paths";

export type BookingPageData =
  | ({ status: "open"; botDetection: BotDetectionConfig } & OpenSlotsResponse)
  | { status: "unavailable"; botDetection: BotDetectionConfig };

type AssessmentCallsControllerOptions = {
  botDetection: BotDetectionConfig;
  botVerifier: BotVerifier;
  bookAssessmentCall: BookAssessmentCallUseCase;
  listOpenSlots: ListOpenSlotsUseCase;
  resolveJoinLink: ResolveJoinLinkUseCase;
};

type BookingErrorOptions = {
  code: BookAssessmentCallErrorCode;
  existing?: { joinPath: string; startsAt: string };
  status: number;
};

type ValidationIssue = {
  path: PropertyKey[];
};

const VALIDATION_ERROR_CODES = {
  email: "invalid_email",
  fullName: "invalid_name",
  notes: "notes_too_long",
  startsAt: "invalid_start",
  visitorTimeZone: "invalid_time_zone",
} as const satisfies Record<string, BookAssessmentCallErrorCode>;

const ERROR_MESSAGES = {
  bot_verification_failed:
    "We could not confirm this request. Please try again.",
  email_already_booked:
    "You already have an assessment call booked with this email address.",
  invalid_email:
    "That email address doesn't look right. Check it and try again.",
  invalid_name: "Please enter your name.",
  invalid_start: "Please choose an available time.",
  invalid_time_zone: "Please choose a known time zone.",
  notes_too_long: "Please keep your notes under 1000 characters.",
  server_error: "Something went wrong on our end. Please try again.",
  slot_unavailable:
    "That time was taken while you were filling in your details. Pick another one — your details are saved.",
} as const satisfies Record<BookAssessmentCallErrorCode, string>;

export class AssessmentCallsController {
  constructor(private readonly options: AssessmentCallsControllerOptions) {}

  async loadBookingPage(): Promise<BookingPageData> {
    const result = await this.options.listOpenSlots.execute();

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

  async listSlots(): Promise<Response> {
    const result = await this.options.listOpenSlots.execute();

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

  async book(request: Request): Promise<Response> {
    const formData = await request.formData();
    const submission = bookAssessmentCallRequestSchema.safeParse({
      email: formData.get("email"),
      fullName: formData.get("fullName"),
      notes: readNotes(formData),
      startsAt: formData.get("startsAt"),
      visitorTimeZone: formData.get("visitorTimeZone"),
    });

    if (!submission.success) {
      return createBookingErrorResponse({
        code: resolveValidationErrorCode(submission.error.issues),
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
      const result = await this.options.bookAssessmentCall.execute({
        email: submission.data.email,
        fullName: submission.data.fullName,
        notes: submission.data.notes ?? null,
        startsAt: new Date(submission.data.startsAt),
        visitorTimeZone: submission.data.visitorTimeZone,
      });

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
    return createBookingErrorResponse({
      code: "email_already_booked",
      existing: summariseCall(result.existing.toSnapshot()),
      status: 409,
    });
  }

  return Response.json(
    bookAssessmentCallSuccessSchema.parse({
      booking: {
        durationMinutes: ASSESSMENT_CALL_RULES.durationMinutes,
        id: result.call.id,
        visitorTimeZone: result.call.visitorTimeZone,
        ...summariseCall(result.call.toSnapshot()),
      },
      success: true,
    }),
    { status: 201 },
  );
}

function summariseCall(call: AssessmentCallSnapshot) {
  return {
    joinPath: assessmentCallJoinPath(call.id),
    startsAt: call.startsAt.toISOString(),
  };
}

function createBookingErrorResponse(options: BookingErrorOptions): Response {
  return Response.json(
    bookAssessmentCallErrorSchema.parse({
      error: {
        code: options.code,
        existing: options.existing,
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

function resolveValidationErrorCode(
  issues: readonly ValidationIssue[],
): BookAssessmentCallErrorCode {
  for (const [field, code] of Object.entries(VALIDATION_ERROR_CODES)) {
    if (issues.some((issue) => issue.path[0] === field)) {
      return code;
    }
  }

  return "server_error";
}

function readNotes(formData: FormData): string | undefined {
  const notes = formData.get("notes");

  return typeof notes === "string" && notes.trim() ? notes : undefined;
}

function readTurnstileToken(formData: FormData): string | null {
  const token = formData.get(TURNSTILE_RESPONSE_FIELD);

  return typeof token === "string" && token.trim() ? token : null;
}
