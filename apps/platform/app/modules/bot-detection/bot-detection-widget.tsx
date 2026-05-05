import { useEffect } from "react";

import {
  type BotDetectionConfig,
  TURNSTILE_RESPONSE_FIELD,
} from "./bot-detection-contract";
import { TurnstileWidget, type TurnstileWidgetController } from "./turnstile-widget";

type BotDetectionWidgetCallbacks = {
  onChallengeError: () => void;
  onControllerChange: (controller: TurnstileWidgetController | null) => void;
  onTokenChange: (token: string) => void;
};

type BotDetectionWidgetProps = BotDetectionWidgetCallbacks & {
  action: string;
  config: BotDetectionConfig;
};

export type BotDetectionWidgetController = TurnstileWidgetController;

export function BotDetectionWidget(props: BotDetectionWidgetProps) {
  if (props.config.provider === "static") {
    return (
      <StaticBotDetectionWidget
        action={props.action}
        onControllerChange={props.onControllerChange}
        onTokenChange={props.onTokenChange}
        token={props.config.token}
      />
    );
  }

  return (
    <TurnstileWidget
      action={props.action}
      onChallengeError={props.onChallengeError}
      onControllerChange={props.onControllerChange}
      onTokenChange={props.onTokenChange}
      siteKey={props.config.siteKey}
    />
  );
}

function StaticBotDetectionWidget(props: {
  action: string;
  onControllerChange: (controller: TurnstileWidgetController | null) => void;
  onTokenChange: (token: string) => void;
  token: string;
}) {
  useEffect(() => {
    const controller: TurnstileWidgetController = {
      execute: () => {
        props.onTokenChange(props.token);
      },
      reset: () => {
        props.onTokenChange(props.token);
      },
    };

    props.onControllerChange(controller);
    controller.execute();

    return () => {
      props.onControllerChange(null);
    };
  }, [props.onControllerChange, props.onTokenChange, props.token]);

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
