import {
  waitlistSchema,
  type WaitlistJoinErrorCode,
  type WaitlistJoinResponse,
  type Waitlist,
} from "@eli-coach-platform/contracts";

export const WAITLIST_API_PATH = "/api/waitlist";

export type WaitlistClientError = Extract<WaitlistJoinResponse, { success: false }>["error"];

const waitlistErrorMessages = {
  bot_verification_failed: "We couldn't verify this signup. Please try again.",
  email_too_long: "Please enter an email address under 320 characters.",
  invalid_email: "That email doesn't look quite right — give it one more look.",
  server_error: "Something went wrong on our end. Try again in a moment.",
} satisfies Record<WaitlistJoinErrorCode, string>;

export function resolveWaitlistError(response: WaitlistJoinResponse | null): WaitlistClientError | null {
  if (!response || response.success) {
    return null;
  }

  return response.error;
}

export function resolveWaitlistErrorMessage(error: WaitlistClientError): string {
  return waitlistErrorMessages[error.code];
}

export function createWaitlistServerErrorResponse(): WaitlistJoinResponse {
  return {
    success: false,
    error: {
      code: "server_error",
      message: "Unable to process waitlist signup.",
    },
  };
}

export function resolveWaitlist(data: unknown): Waitlist | null {
  const result = waitlistSchema.safeParse(data);

  return result.success ? result.data : null;
}
