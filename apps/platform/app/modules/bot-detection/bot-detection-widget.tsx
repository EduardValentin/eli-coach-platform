import { useEffect } from "react";

import {
  type BotDetectionConfig,
  TURNSTILE_RESPONSE_FIELD,
} from "./bot-detection-contract";
import { TurnstileWidget, type TurnstileChallengeHandle } from "./turnstile-widget";

type BotDetectionWidgetCallbacks = {
  onChallengeError: () => void;
  onChallengeReady: (handle: TurnstileChallengeHandle | null) => void;
  onTokenChange: (token: string) => void;
};

type BotDetectionWidgetProps = BotDetectionWidgetCallbacks & {
  action: string;
  config: BotDetectionConfig;
};

export type BotDetectionChallengeHandle = TurnstileChallengeHandle;

export function BotDetectionWidget(props: BotDetectionWidgetProps) {
  if (props.config.provider === "static") {
    return (
      <StaticBotDetectionWidget
        action={props.action}
        onChallengeReady={props.onChallengeReady}
        onTokenChange={props.onTokenChange}
        token={props.config.token}
      />
    );
  }

  return (
    <TurnstileWidget
      action={props.action}
      onChallengeError={props.onChallengeError}
      onChallengeReady={props.onChallengeReady}
      onTokenChange={props.onTokenChange}
      siteKey={props.config.siteKey}
    />
  );
}

function StaticBotDetectionWidget(props: {
  action: string;
  onChallengeReady: (handle: TurnstileChallengeHandle | null) => void;
  onTokenChange: (token: string) => void;
  token: string;
}) {
  useEffect(() => {
    const challengeHandle: TurnstileChallengeHandle = {
      execute: () => {
        props.onTokenChange(props.token);
      },
      reset: () => {
        props.onTokenChange(props.token);
      },
    };

    props.onChallengeReady(challengeHandle);
    challengeHandle.execute();

    return () => {
      props.onChallengeReady(null);
    };
  }, [props.onChallengeReady, props.onTokenChange, props.token]);

  return (
    <div
      aria-hidden="true"
      data-action={props.action}
      data-provider="static"
      data-response-field-name={TURNSTILE_RESPONSE_FIELD}
      data-size="invisible"
      data-testid="bot-detection-widget"
    />
  );
}
