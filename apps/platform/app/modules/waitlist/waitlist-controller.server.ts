import {
  waitlistJoinErrorSchema,
  waitlistJoinRequestSchema,
  waitlistJoinSuccessSchema,
  waitlistSnapshotSchema,
} from "@eli-coach-platform/contracts";
import type { JoinWaitlistResult, WaitingListService } from "@eli-coach-platform/domain";
import {
  TURNSTILE_RESPONSE_FIELD,
  WAITLIST_TURNSTILE_ACTION,
} from "~/modules/bot-detection/bot-detection-contract";
import type { BotVerifier } from "~/modules/bot-detection/bot-verifier.server";
import { resolveRequestRemoteIp } from "~/modules/bot-detection/bot-verifier.server";
import { HttpJsonError } from "~/server/http.server";

type JoinRequestValidationError = {
  issues: readonly { code: string }[];
};

const SERVER_ERROR_MESSAGE = "Something went wrong on our end. Try again in a moment.";
const BOT_VERIFICATION_ERROR_MESSAGE = "We couldn't verify this signup. Please try again.";

export class WaitlistController {
  constructor(
    private readonly waitingListService: WaitingListService,
    private readonly botVerifier: BotVerifier,
  ) {}

  async getSnapshot(): Promise<Response> {
    const waitlist = await this.waitingListService.getWaitlist();
    const responseBody = waitlistSnapshotSchema.parse(waitlist);

    return Response.json(responseBody);
  }

  async join(request: Request): Promise<Response> {
    const formData = await request.formData();
    const requestBody = waitlistJoinRequestSchema.safeParse({
      email: formData.get("email"),
    });

    if (!requestBody.success) {
      throwJoinValidationError(requestBody.error);
    }

    await verifyWaitlistSignup({
      botVerifier: this.botVerifier,
      formData,
      request,
    });

    const result = await joinWaitlistSafely(this.waitingListService, requestBody.data.email);

    return createJoinResponse(result);
  }
}

async function verifyWaitlistSignup(options: {
  botVerifier: BotVerifier;
  formData: FormData;
  request: Request;
}): Promise<void> {
  const result = await options.botVerifier.verifySubmission({
    action: WAITLIST_TURNSTILE_ACTION,
    remoteIp: resolveRequestRemoteIp(options.request),
    token: resolveTurnstileToken(options.formData),
  });

  if (!result.valid) {
    throwBotVerificationError();
  }
}

function resolveTurnstileToken(formData: FormData): string | null {
  const token = formData.get(TURNSTILE_RESPONSE_FIELD);

  return typeof token === "string" && token.trim() ? token : null;
}

async function joinWaitlistSafely(
  waitingListService: WaitingListService,
  email: string,
): Promise<JoinWaitlistResult> {
  try {
    return await waitingListService.joinWaitlist({ email });
  } catch (error) {
    console.error("Waitlist signup failed.", error);
    throwJoinServerError();
  }
}

function throwJoinValidationError(error: JoinRequestValidationError): never {
  const code = resolveJoinValidationErrorCode(error);
  const responseBody = waitlistJoinErrorSchema.parse({
    success: false,
    error: {
      code,
      message: resolveJoinValidationMessage(code),
    },
  });

  throw new HttpJsonError({
    body: responseBody,
    status: 400,
  });
}

function throwJoinServerError(): never {
  const responseBody = waitlistJoinErrorSchema.parse({
    success: false,
    error: {
      code: "server_error",
      message: SERVER_ERROR_MESSAGE,
    },
  });

  throw new HttpJsonError({
    body: responseBody,
    status: 500,
  });
}

function throwBotVerificationError(): never {
  const responseBody = waitlistJoinErrorSchema.parse({
    success: false,
    error: {
      code: "bot_verification_failed",
      message: BOT_VERIFICATION_ERROR_MESSAGE,
    },
  });

  throw new HttpJsonError({
    body: responseBody,
    status: 400,
  });
}

function createJoinResponse(result: JoinWaitlistResult): Response {
  if (result.status === "registered") {
    return Response.json(
      waitlistJoinSuccessSchema.parse({
        pricing: result.pricing,
        success: true,
        spotsRemaining: result.spotsRemaining,
      }),
      { status: 201 },
    );
  }

  const responseBody = waitlistJoinErrorSchema.parse({
    success: false,
    error: {
      code: result.status,
      message: result.message,
    },
  });

  throw new HttpJsonError({
    body: responseBody,
    status: 409,
  });
}

function resolveJoinValidationErrorCode(
  error: JoinRequestValidationError,
): "email_too_long" | "invalid_email" {
  const hasLengthError = error.issues.some((issue) => issue.code === "too_big");

  return hasLengthError ? "email_too_long" : "invalid_email";
}

function resolveJoinValidationMessage(code: "email_too_long" | "invalid_email"): string {
  if (code === "email_too_long") {
    return "Please enter an email address under 320 characters.";
  }

  return "That email doesn't look quite right — give it one more look.";
}
