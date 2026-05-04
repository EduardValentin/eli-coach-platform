import type { WaitlistJoinResponse } from "@eli-coach-platform/contracts";

export function resolveWaitlistErrorMessage(response: WaitlistJoinResponse | null): string | null {
  if (!response || response.success) {
    return null;
  }

  return response.error.message;
}
