import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FetcherWithComponents } from "react-router";

import {
  type BotDetectionConfig,
  TURNSTILE_RESPONSE_FIELD,
  WAITLIST_TURNSTILE_ACTION,
} from "~/modules/bot-detection/bot-detection-contract";
import {
  BotDetectionWidget,
  type BotDetectionChallengeHandle,
} from "~/modules/bot-detection/bot-detection-widget";

type UseBotDetectionSubmissionOptions = {
  action: string;
  botDetectionConfig: BotDetectionConfig;
  fetcher: FetcherWithComponents<unknown>;
};

type BotDetectionSubmission = {
  botDetectionToken: string;
  botDetectionWidget: ReactNode;
  isAwaitingChallenge: boolean;
  resetChallenge: () => void;
  submit: (form: HTMLFormElement) => void;
};

export function useBotDetectionSubmission(
  options: UseBotDetectionSubmissionOptions,
): BotDetectionSubmission {
  const [challengeHandle, setChallengeHandle] = useState<BotDetectionChallengeHandle | null>(
    null,
  );
  const [botDetectionToken, setBotDetectionToken] = useState("");
  const [isAwaitingChallenge, setIsAwaitingChallenge] = useState(false);
  const pendingFormDataRef = useRef<FormData | null>(null);

  const clearPendingSubmission = useCallback(() => {
    pendingFormDataRef.current = null;
    setIsAwaitingChallenge(false);
    setBotDetectionToken("");
  }, []);

  const submitFormData = useCallback(
    (formData: FormData, token: string) => {
      formData.set(TURNSTILE_RESPONSE_FIELD, token);
      clearPendingSubmission();
      options.fetcher.submit(formData, {
        action: options.action,
        method: "post",
      });
    },
    [clearPendingSubmission, options.action, options.fetcher],
  );

  const submit = useCallback(
    (form: HTMLFormElement) => {
      const formData = new FormData(form);

      if (botDetectionToken) {
        submitFormData(formData, botDetectionToken);
        return;
      }

      pendingFormDataRef.current = formData;
      setIsAwaitingChallenge(true);
    },
    [botDetectionToken, submitFormData],
  );

  const resetChallenge = useCallback(() => {
    clearPendingSubmission();
    challengeHandle?.reset();
  }, [challengeHandle, clearPendingSubmission]);

  const handleChallengeError = useCallback(() => {
    clearPendingSubmission();
  }, [clearPendingSubmission]);

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

    submitFormData(pendingFormData, botDetectionToken);
  }, [botDetectionToken, isAwaitingChallenge, submitFormData]);

  return {
    botDetectionToken,
    botDetectionWidget: (
      <BotDetectionWidget
        action={WAITLIST_TURNSTILE_ACTION}
        config={options.botDetectionConfig}
        onChallengeError={handleChallengeError}
        onChallengeReady={setChallengeHandle}
        onTokenChange={setBotDetectionToken}
      />
    ),
    isAwaitingChallenge,
    resetChallenge,
    submit,
  };
}
