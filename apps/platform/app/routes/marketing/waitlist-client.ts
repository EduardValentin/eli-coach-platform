import {
  waitlistJoinResponseSchema,
  type WaitlistJoinResponse,
} from "@eli-coach-platform/contracts";

export function parseWaitlistJoinResponse(data: unknown): WaitlistJoinResponse | null {
  const result = waitlistJoinResponseSchema.safeParse(data);

  return result.success ? result.data : null;
}

export function resolveWaitlistErrorMessage(data: unknown): string | null {
  const response = parseWaitlistJoinResponse(data);

  if (!response || response.success) {
    return null;
  }

  return response.error.message;
}
