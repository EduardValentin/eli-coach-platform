import type { WaitlistJoinResponse } from "@eli-coach-platform/contracts";
import { cn, Input } from "@eli-coach-platform/ui";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FetcherWithComponents } from "react-router";

import {
  TURNSTILE_RESPONSE_FIELD,
  WAITLIST_TURNSTILE_ACTION,
} from "~/modules/bot-detection/bot-detection-contract";
import { TurnstileWidget } from "~/modules/bot-detection/turnstile-widget";
import type { TurnstileWidgetController } from "~/modules/bot-detection/turnstile-widget";

import { resolveWaitlistError, type WaitlistClientError } from "./waitlist-client";
import { launchWaitlistConfetti } from "./waitlist-confetti";

type WaitlistEmailFormProps = {
  fetcher: FetcherWithComponents<unknown>;
  response: WaitlistJoinResponse | null;
  spotsRemaining: number | null;
  turnstileSiteKey: string;
  variant: "dark" | "light";
};

const CONTACT_EMAIL = "contact@elipersonaltrainer.com";
const WAITLIST_FORM_ACTION = "/api/waitlist";

export function WaitlistEmailForm(props: WaitlistEmailFormProps) {
  const { fetcher, response, spotsRemaining, turnstileSiteKey, variant } = props;
  const [email, setEmail] = useState("");
  const [turnstileController, setTurnstileController] =
    useState<TurnstileWidgetController | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isAwaitingBotVerification, setIsAwaitingBotVerification] = useState(false);
  const pendingFormRef = useRef<HTMLFormElement | null>(null);
  const isSubmitting = fetcher.state !== "idle" || isAwaitingBotVerification;
  const isFull = spotsRemaining === 0;
  const isSubmitted = response?.success === true;
  const error = resolveWaitlistError(response);

  useEffect(() => {
    if (!response) {
      return;
    }

    if (response.success && response.pricing === "reduced") {
      launchWaitlistConfetti();
    }
  }, [response]);

  useEffect(() => {
    if (!isAwaitingBotVerification || turnstileToken || !turnstileController) {
      return;
    }

    turnstileController.execute();
  }, [isAwaitingBotVerification, turnstileController, turnstileToken]);

  useEffect(() => {
    const pendingForm = pendingFormRef.current;

    if (!isAwaitingBotVerification || !pendingForm || !turnstileToken) {
      return;
    }

    const formData = new FormData(pendingForm);
    formData.set(TURNSTILE_RESPONSE_FIELD, turnstileToken);
    fetcher.submit(formData, {
      action: WAITLIST_FORM_ACTION,
      method: "post",
    });
    pendingFormRef.current = null;
    setIsAwaitingBotVerification(false);
  }, [fetcher, isAwaitingBotVerification, turnstileToken]);

  useEffect(() => {
    if (fetcher.state !== "idle" || !response || response.success) {
      return;
    }

    pendingFormRef.current = null;
    setIsAwaitingBotVerification(false);
    turnstileController?.reset();
  }, [fetcher.state, response, turnstileController]);

  const handleTurnstileChallengeError = useCallback(() => {
    pendingFormRef.current = null;
    setIsAwaitingBotVerification(false);
    setTurnstileToken("");
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      if (turnstileToken) {
        return;
      }

      event.preventDefault();
      pendingFormRef.current = event.currentTarget;
      setIsAwaitingBotVerification(true);
    },
    [turnstileToken],
  );

  if (isSubmitted) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <div className="flex flex-col items-center gap-3 py-2">
          <CheckCircle2
            aria-hidden="true"
            className="text-brand-secondary"
            size={36}
            strokeWidth={1.5}
          />
          <p
            className={cn("font-heading text-body-lg font-medium", {
              "text-text-inverted": variant === "dark",
              "text-text-primary": variant === "light",
            })}
          >
            You're in. Keep an eye on your inbox.
          </p>
        </div>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <fetcher.Form
          action={WAITLIST_FORM_ACTION}
          className="flex flex-col gap-3 md:flex-row"
          method="post"
          noValidate
          onSubmit={handleSubmit}
        >
          <label className="ui-sr-only" htmlFor="waitlist-email">
            Email address
          </label>
          <Input
            aria-describedby={error ? "waitlist-email-error" : undefined}
            aria-invalid={error ? true : undefined}
            autoComplete="email"
            className="min-h-[var(--size-control-lg)] rounded-pill px-6"
            disabled={isSubmitting}
            id="waitlist-email"
            inputMode="email"
            name="email"
            onChange={(event) => {
              setEmail(event.target.value);
            }}
            placeholder="Enter your email"
            required
            type="text"
            value={email}
            variant={variant === "dark" ? "inverted" : "default"}
          />
          <input name={TURNSTILE_RESPONSE_FIELD} readOnly type="hidden" value={turnstileToken} />
          <button
            aria-label={isSubmitting ? "Joining the notify list" : undefined}
            className="inline-flex min-h-[var(--size-control-lg)] shrink-0 cursor-pointer items-center justify-center rounded-pill border border-transparent bg-brand-primary px-8 text-center text-body-base font-semibold text-text-inverted whitespace-nowrap transition-[background-color,opacity,transform] duration-150 ease-out hover:bg-brand-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-primary"
            disabled={isSubmitting || !email.trim()}
            type="submit"
          >
            {isSubmitting ? (
              <Loader2 aria-hidden="true" className="mx-auto animate-spin" size={20} />
            ) : (
              "Notify me"
            )}
          </button>
          <TurnstileWidget
            action={WAITLIST_TURNSTILE_ACTION}
            onChallengeError={handleTurnstileChallengeError}
            onControllerChange={setTurnstileController}
            onTokenChange={setTurnstileToken}
            siteKey={turnstileSiteKey}
          />
        </fetcher.Form>
        <WaitlistErrorAlert error={error} variant={variant} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <fetcher.Form
        action={WAITLIST_FORM_ACTION}
        className="flex flex-col gap-3 md:flex-row"
        method="post"
        noValidate
        onSubmit={handleSubmit}
      >
        <label className="ui-sr-only" htmlFor="waitlist-email">
          Email address
        </label>
        <Input
          aria-describedby={error ? "waitlist-email-error" : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete="email"
          className="min-h-[var(--size-control-lg)] rounded-pill px-6"
          disabled={isSubmitting}
          id="waitlist-email"
          inputMode="email"
          name="email"
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          placeholder="Enter your email"
          required
          type="text"
          value={email}
          variant={variant === "dark" ? "inverted" : "default"}
        />
        <input name={TURNSTILE_RESPONSE_FIELD} readOnly type="hidden" value={turnstileToken} />
        <button
          aria-label={isSubmitting ? "Joining the list" : undefined}
          className="inline-flex min-h-[var(--size-control-lg)] shrink-0 cursor-pointer items-center justify-center rounded-pill border border-transparent bg-brand-primary px-8 text-center text-body-base font-semibold text-text-inverted whitespace-nowrap transition-[background-color,opacity,transform] duration-150 ease-out hover:bg-brand-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-primary"
          disabled={isSubmitting || !email.trim()}
          type="submit"
        >
          {isSubmitting ? (
            <Loader2 aria-hidden="true" className="mx-auto animate-spin" size={20} />
          ) : (
            "Join the list"
          )}
        </button>
        <TurnstileWidget
          action={WAITLIST_TURNSTILE_ACTION}
          onChallengeError={handleTurnstileChallengeError}
          onControllerChange={setTurnstileController}
          onTokenChange={setTurnstileToken}
          siteKey={turnstileSiteKey}
        />
      </fetcher.Form>
      <WaitlistErrorAlert error={error} variant={variant} />
    </div>
  );
}

function WaitlistErrorAlert(props: {
  error: WaitlistClientError | null;
  variant: "dark" | "light";
}) {
  const { error, variant } = props;

  if (!error) {
    return null;
  }

  return (
    <div
      className={cn("mt-3 flex items-start justify-center gap-2 text-body-sm leading-snug", {
        "text-feedback-danger": variant === "light",
        "text-feedback-danger-on-inverted": variant === "dark",
      })}
      id="waitlist-email-error"
      role="alert"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
      <p className="text-left">
        <WaitlistErrorContent error={error} />
      </p>
    </div>
  );
}

function WaitlistErrorContent(props: { error: WaitlistClientError }) {
  const { error } = props;

  if (error.code !== "server_error") {
    return <span>{error.message}</span>;
  }

  return (
    <span>
      Something went wrong on our end. Try again in a moment — or email{" "}
      <a className="underline underline-offset-2 hover:no-underline" href={`mailto:${CONTACT_EMAIL}`}>
        {CONTACT_EMAIL}
      </a>{" "}
      if it keeps happening.
    </span>
  );
}
