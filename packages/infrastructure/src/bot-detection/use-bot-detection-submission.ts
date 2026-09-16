import { useCallback, useEffect, useRef, useState } from "react";

import type { BotDetectionConfig } from "./bot-detection-contract";
import type {
  BotDetectionChallengeHandle,
  BotDetectionWidgetProps,
} from "./bot-detection-widget";
import {
  reduceBotDetectionFlow,
  type BotDetectionFlowEvent,
  type BotDetectionFlowState,
} from "./bot-detection-flow";

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

const IDLE_STATE: BotDetectionFlowState = {
  awaitingChallenge: false,
  pendingFormData: null,
  token: "",
};

export function useBotDetectionSubmission(
  options: UseBotDetectionSubmissionOptions,
): BotDetectionSubmission {
  const { action, config, onSubmitFormData } = options;
  const [challengeHandle, setChallengeHandle] =
    useState<BotDetectionChallengeHandle | null>(null);
  const [state, setState] = useState<BotDetectionFlowState>(IDLE_STATE);
  const [botDetectionError, setBotDetectionError] = useState<string | null>(
    null,
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  const dispatch = useCallback(
    (event: BotDetectionFlowEvent) => {
      const result = reduceBotDetectionFlow(stateRef.current, event);

      stateRef.current = result.state;
      setState(result.state);
      setBotDetectionError(result.error);

      if (result.deliver) {
        onSubmitFormData(result.deliver);
      }
    },
    [onSubmitFormData],
  );

  const submitFormData = useCallback(
    (formData: FormData) => dispatch({ type: "submit", formData }),
    [dispatch],
  );

  const resetChallenge = useCallback(() => {
    dispatch({ type: "reset" });
    challengeHandle?.reset();
  }, [challengeHandle, dispatch]);

  const handleChallengeError = useCallback(() => {
    dispatch({ type: "challenge-error" });
  }, [dispatch]);

  const handleTokenChange = useCallback(
    (token: string) => dispatch({ type: "token", token }),
    [dispatch],
  );

  useEffect(() => {
    if (!state.awaitingChallenge || state.token || !challengeHandle) {
      return;
    }

    challengeHandle.execute();
  }, [challengeHandle, state.awaitingChallenge, state.token]);

  return {
    botDetectionError,
    botDetectionToken: state.token,
    botDetectionWidgetProps: {
      action,
      config,
      onChallengeError: handleChallengeError,
      onChallengeReady: setChallengeHandle,
      onTokenChange: handleTokenChange,
    },
    isAwaitingChallenge: state.awaitingChallenge,
    resetChallenge,
    submitFormData,
  };
}
