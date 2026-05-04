import {
  waitlistJoinErrorSchema,
  waitlistJoinRequestSchema,
  waitlistJoinSuccessSchema,
  waitlistSnapshotSchema,
} from "@eli-coach-platform/contracts";
import type { JoinWaitlistResult, WaitingListService } from "@eli-coach-platform/domain";
import { HttpJsonError } from "~/server/http.server";

type JoinRequestValidationError = {
  issues: readonly { code: string }[];
};

export class WaitlistController {
  constructor(private readonly waitingListService: WaitingListService) {}

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

    const result = await this.waitingListService.joinWaitlist({ email: requestBody.data.email });

    return createJoinResponse(result);
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

function createJoinResponse(result: JoinWaitlistResult): Response {
  if (result.status === "joined") {
    return Response.json(
      waitlistJoinSuccessSchema.parse({
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

  return "Please enter a valid email address.";
}
