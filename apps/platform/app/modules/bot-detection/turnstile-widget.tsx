import { useEffect, useMemo, useRef } from "react";

import { TURNSTILE_RESPONSE_FIELD } from "./bot-detection-contract";

const TURNSTILE_ONLOAD_CALLBACK = "__eliCoachTurnstileLoaded";
const TURNSTILE_SCRIPT_SRC = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=${TURNSTILE_ONLOAD_CALLBACK}`;
const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";

type TurnstileRenderOptions = {
  action: string;
  callback: (token: string) => void;
  "error-callback": () => void;
  execution: "execute";
  "expired-callback": () => void;
  "response-field-name": string;
  "response-field": false;
  size: "invisible";
  sitekey: string;
  "timeout-callback": () => void;
};

type TurnstileApi = {
  execute: (container: HTMLElement) => void;
  remove: (widgetId: string) => void;
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    __eliCoachTurnstileLoaded?: () => void;
    turnstile?: TurnstileApi;
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

export type TurnstileWidgetController = {
  execute: () => void;
  reset: () => void;
};

type TurnstileWidgetCallbacks = {
  onChallengeError: () => void;
  onControllerChange: (controller: TurnstileWidgetController | null) => void;
  onTokenChange: (token: string) => void;
};

type TurnstileWidgetProps = TurnstileWidgetCallbacks & {
  action: string;
  siteKey: string;
};

type UseTurnstileWidgetOptions = {
  action: string;
  callbacks: TurnstileWidgetCallbacks;
  siteKey: string;
};

export function TurnstileWidget(props: TurnstileWidgetProps) {
  const callbacks = useMemo(
    () => ({
      onChallengeError: props.onChallengeError,
      onControllerChange: props.onControllerChange,
      onTokenChange: props.onTokenChange,
    }),
    [props.onChallengeError, props.onControllerChange, props.onTokenChange],
  );
  const containerRef = useTurnstileWidget({
    action: props.action,
    callbacks,
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

function useTurnstileWidget(options: UseTurnstileWidgetOptions) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (import.meta.env.MODE === "test") {
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    let widgetId: string | null = null;
    let isUnmounted = false;

    loadTurnstileScript()
      .then(() => {
        if (isUnmounted || !window.turnstile) {
          return;
        }

        widgetId = window.turnstile.render(container, {
          action: options.action,
          callback: (token) => {
            options.callbacks.onTokenChange(token);
          },
          "error-callback": () => {
            options.callbacks.onChallengeError();
          },
          execution: "execute",
          "expired-callback": () => {
            options.callbacks.onTokenChange("");
          },
          "response-field-name": TURNSTILE_RESPONSE_FIELD,
          "response-field": false,
          size: "invisible",
          sitekey: options.siteKey,
          "timeout-callback": () => {
            options.callbacks.onChallengeError();
          },
        });
        options.callbacks.onControllerChange({
          execute: () => {
            window.turnstile?.execute(container);
          },
          reset: () => {
            if (widgetId) {
              window.turnstile?.reset(widgetId);
            }

            options.callbacks.onTokenChange("");
          },
        });
      })
      .catch(() => {
        if (!isUnmounted) {
          options.callbacks.onChallengeError();
        }
      });

    return () => {
      isUnmounted = true;
      options.callbacks.onControllerChange(null);

      if (widgetId) {
        window.turnstile?.remove(widgetId);
      }
    };
  }, [options.action, options.callbacks, options.siteKey]);

  return containerRef;
}

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    window[TURNSTILE_ONLOAD_CALLBACK] = () => {
      resolve();
    };

    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);

    if (existingScript && !window.turnstile) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.defer = true;
    script.id = TURNSTILE_SCRIPT_ID;
    script.onerror = () => {
      turnstileScriptPromise = null;
      reject(new Error("Turnstile script failed to load."));
    };
    script.src = TURNSTILE_SCRIPT_SRC;

    document.head.append(script);
  });

  return turnstileScriptPromise;
}
