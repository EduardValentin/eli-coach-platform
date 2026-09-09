import { useCallback, useEffect, useRef, useState } from "react";

import {
  type BotDetectionConfig,
  TURNSTILE_RESPONSE_FIELD,
} from "./bot-detection-contract";
import type {
  BotDetectionChallengeHandle,
  BotDetectionWidgetProps,
} from "./bot-detection-widget";

type UseBotDetectionSubmissionOptions = {
  action: string;
  config: BotDetectionConfig;
  onSubmitFormData: (formData: FormData) => void;
};

type BotDetectionSubmission = {
  botDetectionError: string | null;
  botDetectionToken: string;
  botDetectionWidgetProps: BotDetectionWidgetProps;
  isAwaitingChallenge: boolean;
  resetChallenge: () => void;
  submitFormData: (formData: FormData) => void;
};

const BOT_DETECTION_ERROR_MESSAGE =
  "We couldn't verify this request. Please try again.";

export function useBotDetectionSubmission(
  options: UseBotDetectionSubmissionOptions,
): BotDetectionSubmission {
  const { action, config, onSubmitFormData } = options;
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

      if (botDetectionToken) {
        deliverFormData(formData, botDetectionToken);
        return;
      }

      pendingFormDataRef.current = formData;
      setIsAwaitingChallenge(true);
    },
    [botDetectionToken, deliverFormData],
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
    botDetectionError,
    botDetectionToken,
    botDetectionWidgetProps: {
      action,
      config,
      onChallengeError: handleChallengeError,
      onChallengeReady: setChallengeHandle,
      onTokenChange: handleTokenChange,
    },
    isAwaitingChallenge,
    resetChallenge,
    submitFormData,
  };
}
