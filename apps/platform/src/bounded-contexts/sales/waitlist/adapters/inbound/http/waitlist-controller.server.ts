import {
  type WaitlistJoinErrorCode,
  waitlistJoinErrorSchema,
  waitlistJoinRequestSchema,
  waitlistJoinSuccessSchema,
  waitlistSchema,
  type Waitlist,
} from "~/bounded-contexts/sales/waitlist/public/waitlist";
import {
  type BotVerifierPort,
  resolveRequestRemoteIp,
} from "~/shared/submission-checks/bot-detection/index.server";
import type {
  GetWaitlistUseCase,
  JoinWaitlistResult,
  JoinWaitlistUseCase,
} from "~/bounded-contexts/sales/waitlist/domain/waitlist";
import { createHash } from "node:crypto";
import {
  TURNSTILE_RESPONSE_FIELD,
  WAITLIST_TURNSTILE_ACTION,
} from "~/shared/submission-checks/bot-detection";
import { HttpJsonError } from "~/shared/http/index.server";

type JoinRequestValidationError = {
  issues: readonly { code: string }[];
};

const WAITLIST_ERROR_MESSAGE = "Unable to process waitlist signup.";

type WaitlistControllerOptions = {
  botVerifierPort: BotVerifierPort;
  getWaitlistUseCase: GetWaitlistUseCase;
  joinWaitlistUseCase: JoinWaitlistUseCase;
};

export class WaitlistController {
  constructor(private readonly options: WaitlistControllerOptions) {}

  async getWaitlist(): Promise<Waitlist> {
    return waitlistSchema.parse(
      await this.options.getWaitlistUseCase.execute(),
    );
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
      botVerifierPort: this.options.botVerifierPort,
      formData,
      request,
    });

    const result = await joinWaitlistSafely(
      this.options.joinWaitlistUseCase,
      requestBody.data.email,
    );

    if (result.status === "subaddress_refused") {
      throwSubaddressRefusedError();
    }

    return createJoinResponse({
      email: requestBody.data.email,
      result,
    });
  }
}

async function verifyWaitlistSignup(options: {
  botVerifierPort: BotVerifierPort;
  formData: FormData;
  request: Request;
}): Promise<void> {
  const result = await options.botVerifierPort.verifySubmission({
    action: WAITLIST_TURNSTILE_ACTION,
    remoteIp: resolveRequestRemoteIp(options.request),
    token: resolveTurnstileToken(options.formData),
  });

  if (result.status === "unavailable") {
    throwJoinServerError();
  }

  if (result.status === "rejected") {
    throwBotVerificationError();
  }
}

function resolveTurnstileToken(formData: FormData): string | null {
  const token = formData.get(TURNSTILE_RESPONSE_FIELD);

  return typeof token === "string" && token.trim() ? token : null;
}

async function joinWaitlistSafely(
  joinWaitlistUseCase: JoinWaitlistUseCase,
  email: string,
): Promise<JoinWaitlistResult> {
  try {
    return await joinWaitlistUseCase.execute({ email });
  } catch {
    console.error("Waitlist signup failed.", {
      errorCategory: "waitlist_join_failure",
    });
    throwJoinServerError();
  }
}

function throwJoinValidationError(error: JoinRequestValidationError): never {
  const code = resolveJoinValidationErrorCode(error);

  throw new HttpJsonError({
    body: createJoinErrorResponseBody(code),
    status: 400,
  });
}

function throwJoinServerError(): never {
  throw new HttpJsonError({
    body: createJoinErrorResponseBody("server_error"),
    status: 500,
  });
}

function throwSubaddressRefusedError(): never {
  throw new HttpJsonError({
    body: createJoinErrorResponseBody("email_subaddress_refused"),
    status: 400,
  });
}

function throwBotVerificationError(): never {
  throw new HttpJsonError({
    body: createJoinErrorResponseBody("bot_verification_failed"),
    status: 400,
  });
}

function createJoinResponse(options: {
  email: string;
  result: JoinWaitlistResult;
}): Response {
  const { email, result } = options;

  if (result.status === "already_registered") {
    console.warn("Duplicate waitlist signup suppressed.", {
      emailHash: hashWaitlistEmail(email),
    });
  }

  return createJoinSuccessResponse();
}

function createJoinSuccessResponse(): Response {
  return Response.json(waitlistJoinSuccessSchema.parse({ success: true }), {
    status: 201,
  });
}

function createJoinErrorResponseBody(code: WaitlistJoinErrorCode) {
  return waitlistJoinErrorSchema.parse({
    success: false,
    error: {
      code,
      message: WAITLIST_ERROR_MESSAGE,
    },
  });
}

function resolveJoinValidationErrorCode(
  error: JoinRequestValidationError,
): "email_too_long" | "invalid_email" {
  const hasLengthError = error.issues.some((issue) => issue.code === "too_big");

  return hasLengthError ? "email_too_long" : "invalid_email";
}

function hashWaitlistEmail(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}
