import { TURNSTILE_RESPONSE_FIELD } from "./bot-detection-contract";
import {
  type TurnstileChallengeHandle,
  useTurnstileWidget,
} from "./turnstile-client";

export type { TurnstileChallengeHandle } from "./turnstile-client";

type TurnstileWidgetProps = {
  action: string;
  onChallengeError: () => void;
  onChallengeReady: (handle: TurnstileChallengeHandle | null) => void;
  onTokenChange: (token: string) => void;
  siteKey: string;
};

export function TurnstileWidget(props: TurnstileWidgetProps) {
  const containerRef = useTurnstileWidget({
    action: props.action,
    onChallengeError: props.onChallengeError,
    onChallengeReady: props.onChallengeReady,
    onTokenChange: props.onTokenChange,
    siteKey: props.siteKey,
  });

  return (
    <div
      aria-hidden="true"
      data-action={props.action}
      data-response-field-name={TURNSTILE_RESPONSE_FIELD}
      data-size="invisible"
      data-sitekey={props.siteKey}
      data-testid="bot-detection-widget"
      data-turnstile-widget=""
      ref={containerRef}
    />
  );
}
