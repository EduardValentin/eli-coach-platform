import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FetcherWithComponents } from "react-router";

import {
  TURNSTILE_RESPONSE_FIELD,
  WAITLIST_TURNSTILE_ACTION,
} from "~/modules/bot-detection/bot-detection-contract";
import { TurnstileWidget } from "~/modules/bot-detection/turnstile-widget";
import type { TurnstileWidgetController } from "~/modules/bot-detection/turnstile-widget";

type UseTurnstileSubmissionOptions = {
  action: string;
  fetcher: FetcherWithComponents<unknown>;
  turnstileSiteKey: string;
};

type TurnstileSubmission = {
  isAwaitingChallenge: boolean;
  resetChallenge: () => void;
  submit: (form: HTMLFormElement) => void;
  turnstileToken: string;
  turnstileWidget: ReactNode;
};

export function useTurnstileSubmission(
  options: UseTurnstileSubmissionOptions,
): TurnstileSubmission {
  const [turnstileController, setTurnstileController] =
    useState<TurnstileWidgetController | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isAwaitingChallenge, setIsAwaitingChallenge] = useState(false);
  const pendingFormDataRef = useRef<FormData | null>(null);

  const clearPendingSubmission = useCallback(() => {
    pendingFormDataRef.current = null;
    setIsAwaitingChallenge(false);
    setTurnstileToken("");
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

      if (turnstileToken) {
        submitFormData(formData, turnstileToken);
        return;
      }

      pendingFormDataRef.current = formData;
      setIsAwaitingChallenge(true);
    },
    [submitFormData, turnstileToken],
  );

  const resetChallenge = useCallback(() => {
    clearPendingSubmission();
    turnstileController?.reset();
  }, [clearPendingSubmission, turnstileController]);

  const handleChallengeError = useCallback(() => {
    clearPendingSubmission();
  }, [clearPendingSubmission]);

  useEffect(() => {
    if (!isAwaitingChallenge || turnstileToken || !turnstileController) {
      return;
    }

    turnstileController.execute();
  }, [isAwaitingChallenge, turnstileController, turnstileToken]);

  useEffect(() => {
    const pendingFormData = pendingFormDataRef.current;

    if (!isAwaitingChallenge || !pendingFormData || !turnstileToken) {
      return;
    }

    submitFormData(pendingFormData, turnstileToken);
  }, [isAwaitingChallenge, submitFormData, turnstileToken]);

  return {
    isAwaitingChallenge,
    resetChallenge,
    submit,
    turnstileToken,
    turnstileWidget: (
      <TurnstileWidget
        action={WAITLIST_TURNSTILE_ACTION}
        onChallengeError={handleChallengeError}
        onControllerChange={setTurnstileController}
        onTokenChange={setTurnstileToken}
        siteKey={options.turnstileSiteKey}
      />
    ),
  };
}
