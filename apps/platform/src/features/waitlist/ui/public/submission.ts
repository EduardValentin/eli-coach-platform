import { useEffect } from "react";

import {
  useBotDetectionSubmission,
  WAITLIST_TURNSTILE_ACTION,
  type BotDetectionConfig,
} from "@eli-coach-platform/infrastructure/bot-detection";

import { useJoinWaitlistFetcher } from "./api-client";
import { launchWaitlistConfetti } from "./confetti";
import { resolveWaitlistError } from "./errors";

export function useWaitlistSubmission(botDetection: BotDetectionConfig) {
  const joinWaitlist = useJoinWaitlistFetcher();
  const { isSubmitting, response, submit } = joinWaitlist;
  const botDetectionSubmission = useBotDetectionSubmission({
    action: WAITLIST_TURNSTILE_ACTION,
    config: botDetection,
    onSubmitFormData: submit,
  });
  const { resetChallenge } = botDetectionSubmission;

  useEffect(() => {
    if (response?.success) {
      launchWaitlistConfetti();
    }
  }, [response]);

  useEffect(() => {
    if (isSubmitting || !response || response.success) {
      return;
    }

    resetChallenge();
  }, [isSubmitting, resetChallenge, response]);

  return {
    botDetectionError: botDetectionSubmission.botDetectionError,
    botDetectionToken: botDetectionSubmission.botDetectionToken,
    botDetectionWidgetProps: botDetectionSubmission.botDetectionWidgetProps,
    error: resolveWaitlistError(response),
    isSubmitted: response?.success === true,
    isSubmitting: isSubmitting || botDetectionSubmission.isAwaitingChallenge,
    submitForm: (form: HTMLFormElement) => {
      botDetectionSubmission.submitFormData(new FormData(form));
    },
  };
}
