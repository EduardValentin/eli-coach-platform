import { useCallback, useEffect, useRef, useState } from "react";

import {
  type BotDetectionRuntimeState,
  TURNSTILE_RESPONSE_FIELD,
} from "./bot-detection-contract";
import type {
  BotDetectionChallengeHandle,
  BotDetectionWidgetProps,
} from "./bot-detection-widget";

type UseBotDetectionSubmissionOptions = {
  action: string;
  botDetection: BotDetectionRuntimeState;
  onSubmitFormData: (formData: FormData) => void;
};

type BotDetectionSubmission = {
  botDetectionError: string | null;
  botDetectionIsReady: boolean;
  botDetectionToken: string;
  botDetectionWidgetProps: BotDetectionWidgetProps | null;
  isAwaitingChallenge: boolean;
  resetChallenge: () => void;
  submitFormData: (formData: FormData) => void;
};

const BOT_DETECTION_ERROR_MESSAGE =
  "We couldn't verify this request. Please try again.";
const BOT_DETECTION_UNAVAILABLE_MESSAGE =
  "We couldn't prepare this form. Please try again in a moment.";

export function useBotDetectionSubmission(
  options: UseBotDetectionSubmissionOptions,
): BotDetectionSubmission {
  const { action, botDetection, onSubmitFormData } = options;
  const [challengeHandle, setChallengeHandle] =
    useState<BotDetectionChallengeHandle | null>(null);
  const [botDetectionToken, setBotDetectionToken] = useState("");
  const [botDetectionError, setBotDetectionError] = useState<string | null>(
    null,
  );
  const [isAwaitingChallenge, setIsAwaitingChallenge] = useState(false);
  const pendingFormDataRef = useRef<FormData | null>(null);

  const clearPendingSubmission = useCallback(() => {
    pendingFormDataRef.current = null;
    setIsAwaitingChallenge(false);
    setBotDetectionToken("");
  }, []);

  const deliverFormData = useCallback(
    (formData: FormData, token: string) => {
      formData.set(TURNSTILE_RESPONSE_FIELD, token);
      clearPendingSubmission();
      onSubmitFormData(formData);
    },
    [clearPendingSubmission, onSubmitFormData],
  );

  const submitFormData = useCallback(
    (formData: FormData) => {
      setBotDetectionError(null);

      if (botDetection.status !== "ready") {
        setBotDetectionError(BOT_DETECTION_UNAVAILABLE_MESSAGE);
        return;
      }

      if (botDetectionToken) {
        deliverFormData(formData, botDetectionToken);
        return;
      }

      pendingFormDataRef.current = formData;
      setIsAwaitingChallenge(true);
    },
    [botDetection.status, botDetectionToken, deliverFormData],
  );

  const resetChallenge = useCallback(() => {
    clearPendingSubmission();
    setBotDetectionError(null);
    challengeHandle?.reset();
  }, [challengeHandle, clearPendingSubmission]);

  const handleChallengeError = useCallback(() => {
    clearPendingSubmission();
    setBotDetectionError(BOT_DETECTION_ERROR_MESSAGE);
  }, [clearPendingSubmission]);

  const handleTokenChange = useCallback((token: string) => {
    setBotDetectionToken(token);

    if (token) {
      setBotDetectionError(null);
    }
  }, []);

  useEffect(() => {
    if (!isAwaitingChallenge || botDetectionToken || !challengeHandle) {
      return;
    }

    challengeHandle.execute();
  }, [challengeHandle, botDetectionToken, isAwaitingChallenge]);

  useEffect(() => {
    const pendingFormData = pendingFormDataRef.current;

    if (!isAwaitingChallenge || !pendingFormData || !botDetectionToken) {
      return;
    }

    deliverFormData(pendingFormData, botDetectionToken);
  }, [botDetectionToken, deliverFormData, isAwaitingChallenge]);

  return {
    botDetectionError:
      botDetection.status === "unavailable"
        ? BOT_DETECTION_UNAVAILABLE_MESSAGE
        : botDetectionError,
    botDetectionIsReady: botDetection.status === "ready",
    botDetectionToken,
    botDetectionWidgetProps:
      botDetection.status === "ready"
        ? {
            action,
            config: botDetection.config,
            onChallengeError: handleChallengeError,
            onChallengeReady: setChallengeHandle,
            onTokenChange: handleTokenChange,
          }
        : null,
    isAwaitingChallenge,
    resetChallenge,
    submitFormData,
  };
}
