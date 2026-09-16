import type { WaitlistJoinResponse } from "~/features/waitlist/contracts/waitlist";

import { resolveWaitlistError, type WaitlistClientError } from "./errors";

export function resolveSubmissionState(input: {
  isAwaitingChallenge: boolean;
  isSubmitting: boolean;
  response: WaitlistJoinResponse | null;
}): {
  error: WaitlistClientError | null;
  isSubmitted: boolean;
  isSubmitting: boolean;
  shouldCelebrate: boolean;
  shouldResetChallenge: boolean;
} {
  return {
    error: resolveWaitlistError(input.response),
    isSubmitted: input.response?.success === true,
    isSubmitting: input.isSubmitting || input.isAwaitingChallenge,
    shouldCelebrate: input.response?.success === true,
    shouldResetChallenge:
      !input.isSubmitting &&
      input.response !== null &&
      !input.response.success,
  };
}
