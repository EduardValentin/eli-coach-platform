import {
  waitlistSnapshotSchema,
  type WaitlistJoinErrorCode,
  type WaitlistJoinResponse,
  type WaitlistSnapshot,
} from "@eli-coach-platform/contracts";

export const WAITLIST_API_PATH = "/api/waitlist";

export type WaitlistClientError = Extract<WaitlistJoinResponse, { success: false }>["error"];

const waitlistErrorMessages = {
  already_registered: "Good news — you're already on the list. We'll be in touch when doors open.",
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

export function resolveWaitlistSnapshot(data: unknown): WaitlistSnapshot | null {
  const result = waitlistSnapshotSchema.safeParse(data);

  return result.success ? result.data : null;
}
