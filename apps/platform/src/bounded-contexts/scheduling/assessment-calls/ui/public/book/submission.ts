import { useEffect } from "react";

import {
  ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION,
  useBotDetectionSubmission,
  type BotDetectionConfig,
} from "@eli-coach-platform/infrastructure/bot-detection";

import { useBookAssessmentCallFetcher } from "./api-client";

export type BookAssessmentCallSubmission = ReturnType<
  typeof useBookAssessmentCallSubmission
>;

export function useBookAssessmentCallSubmission(
  botDetection: BotDetectionConfig,
) {
  const booking = useBookAssessmentCallFetcher();
  const { isSubmitting, response, submit } = booking;
  const botDetectionSubmission = useBotDetectionSubmission({
    action: ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION,
    config: botDetection,
    onSubmitFormData: submit,
  });
  const { resetChallenge } = botDetectionSubmission;
  const shouldResetChallenge =
    !isSubmitting && response !== null && !response.success;

  useEffect(() => {
    if (shouldResetChallenge) {
      resetChallenge();
    }
  }, [resetChallenge, shouldResetChallenge]);

  return {
    botDetectionError: botDetectionSubmission.botDetectionError,
    botDetectionWidgetProps: botDetectionSubmission.botDetectionWidgetProps,
    isSubmitting: isSubmitting || botDetectionSubmission.isAwaitingChallenge,
    response,
    submitFormData: botDetectionSubmission.submitFormData,
  };
}
