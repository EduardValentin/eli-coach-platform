import { useEffect } from "react";

import {
  useBotDetectionSubmission,
  WAITLIST_TURNSTILE_ACTION,
  type BotDetectionConfig,
} from "@eli-coach-platform/infrastructure/bot-detection";

import { launchWaitlistConfetti } from "./confetti";
import { resolveWaitlistError } from "./errors";
import { useJoinWaitlistMutation } from "./query";

export function useWaitlistSubmission(botDetection: BotDetectionConfig) {
  const mutation = useJoinWaitlistMutation();
  const { mutate } = mutation;
  const botDetectionSubmission = useBotDetectionSubmission({
    action: WAITLIST_TURNSTILE_ACTION,
    config: botDetection,
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
