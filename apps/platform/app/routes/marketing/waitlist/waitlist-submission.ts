import { useEffect } from "react";

import type { BotDetectionRuntimeState } from "~/modules/bot-detection/bot-detection-contract";
import { WAITLIST_TURNSTILE_ACTION } from "~/modules/bot-detection/bot-detection-contract";
import { useBotDetectionSubmission } from "~/modules/bot-detection/use-bot-detection-submission";

import { resolveWaitlistError } from "./waitlist-client";
import { launchWaitlistConfetti } from "./waitlist-confetti";
import { useJoinWaitlistMutation } from "./waitlist-query";

export function useWaitlistSubmission(
  botDetection: BotDetectionRuntimeState,
) {
  const mutation = useJoinWaitlistMutation();
  const { mutate } = mutation;
  const botDetectionSubmission = useBotDetectionSubmission({
    action: WAITLIST_TURNSTILE_ACTION,
    botDetection,
    onSubmitFormData: mutate,
  });
  const { resetChallenge } = botDetectionSubmission;
  const response = mutation.data ?? null;

  useEffect(() => {
    if (response?.success) {
      launchWaitlistConfetti();
    }
  }, [response]);

  useEffect(() => {
    if (mutation.isPending || !response || response.success) {
      return;
    }

    resetChallenge();
  }, [mutation.isPending, resetChallenge, response]);

  return {
    botDetectionError: botDetectionSubmission.botDetectionError,
    botDetectionIsReady: botDetectionSubmission.botDetectionIsReady,
    botDetectionToken: botDetectionSubmission.botDetectionToken,
    botDetectionWidgetProps:
      botDetectionSubmission.botDetectionWidgetProps,
    error: resolveWaitlistError(response),
    isSubmitted: response?.success === true,
    isSubmitting:
      mutation.isPending || botDetectionSubmission.isAwaitingChallenge,
    submitForm: (form: HTMLFormElement) => {
      botDetectionSubmission.submitFormData(new FormData(form));
    },
  };
}
