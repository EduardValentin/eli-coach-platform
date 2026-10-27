import { useEffect } from "react";

import {
  useBotDetectionSubmission,
  WAITLIST_TURNSTILE_ACTION,
  type BotDetectionConfig,
} from "@eli-coach-platform/infrastructure/bot-detection";

import { useJoinWaitlistFetcher } from "./api-client";
import { launchWaitlistConfetti } from "./confetti";
import { resolveSubmissionState } from "./submission-flow";

export function useWaitlistSubmission(botDetection: BotDetectionConfig) {
  const joinWaitlist = useJoinWaitlistFetcher();
  const { isSubmitting, response, submit } = joinWaitlist;
  const botDetectionSubmission = useBotDetectionSubmission({
    action: WAITLIST_TURNSTILE_ACTION,
    config: botDetection,
    onSubmitFormData: submit,
  });
  const { resetChallenge } = botDetectionSubmission;
  const state = resolveSubmissionState({
    isAwaitingChallenge: botDetectionSubmission.isAwaitingChallenge,
    isSubmitting,
    response,
  });

  useEffect(() => {
    if (state.shouldCelebrate) {
      launchWaitlistConfetti();
    }
  }, [state.shouldCelebrate]);

  useEffect(() => {
    if (state.shouldResetChallenge) {
      resetChallenge();
    }
  }, [resetChallenge, state.shouldResetChallenge]);

  return {
    botDetectionError: botDetectionSubmission.botDetectionError,
    botDetectionToken: botDetectionSubmission.botDetectionToken,
    botDetectionWidgetProps: botDetectionSubmission.botDetectionWidgetProps,
    error: state.error,
    isSubmitted: state.isSubmitted,
    isSubmitting: state.isSubmitting,
    submitForm: (form: HTMLFormElement) => {
      botDetectionSubmission.submitFormData(new FormData(form));
    },
  };
}
