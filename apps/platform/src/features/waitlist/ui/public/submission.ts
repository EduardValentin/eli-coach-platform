import { useEffect } from "react";

import {
  useBotDetectionSubmission,
  WAITLIST_TURNSTILE_ACTION,
  type BotDetectionRuntimeState,
} from "@eli-coach-platform/infrastructure/bot-detection";

import { launchWaitlistConfetti } from "./confetti";
import { resolveWaitlistError } from "./errors";
import { useJoinWaitlistMutation } from "./query";

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
