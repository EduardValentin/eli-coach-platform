import type { WaitlistJoinResponse } from "@eli-coach-platform/contracts";

export type WaitlistClientError = Extract<WaitlistJoinResponse, { success: false }>["error"];

export function resolveWaitlistError(response: WaitlistJoinResponse | null): WaitlistClientError | null {
  if (!response || response.success) {
    return null;
  }

  return response.error;
}

export function resolveWaitlistErrorMessage(response: WaitlistJoinResponse | null): string | null {
  const error = resolveWaitlistError(response);

  return error?.message ?? null;
}
