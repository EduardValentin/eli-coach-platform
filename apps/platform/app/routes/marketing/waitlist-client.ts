import {
  waitlistSnapshotSchema,
  type WaitlistJoinResponse,
  type WaitlistSnapshot,
} from "@eli-coach-platform/contracts";

export const WAITLIST_API_PATH = "/api/waitlist";

export type WaitlistClientError = Extract<WaitlistJoinResponse, { success: false }>["error"];

export function resolveWaitlistError(response: WaitlistJoinResponse | null): WaitlistClientError | null {
  if (!response || response.success) {
    return null;
  }

  return response.error;
}

export function resolveWaitlistSnapshot(data: unknown): WaitlistSnapshot | null {
  const result = waitlistSnapshotSchema.safeParse(data);

  return result.success ? result.data : null;
}

export function resolveWaitlistErrorMessage(response: WaitlistJoinResponse | null): string | null {
  const error = resolveWaitlistError(response);

  return error?.message ?? null;
}
