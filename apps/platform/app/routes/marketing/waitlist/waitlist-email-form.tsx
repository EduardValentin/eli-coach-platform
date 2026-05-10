import type { WaitlistJoinResponse } from "@eli-coach-platform/contracts";
import { ELI_COACH_CONTACT_EMAIL } from "@eli-coach-platform/content";
import { buttonVariants, cn, inputClasses } from "@eli-coach-platform/ui";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import {
  type BotDetectionConfig,
  TURNSTILE_RESPONSE_FIELD,
} from "~/modules/bot-detection/bot-detection-contract";

import { useBotDetectionSubmission } from "./use-bot-detection-submission";
import {
  resolveWaitlistError,
  resolveWaitlistErrorMessage,
  type WaitlistClientError,
} from "./waitlist-client";
import { launchWaitlistConfetti } from "./waitlist-confetti";

type WaitlistEmailFormProps = {
  botDetectionConfig: BotDetectionConfig;
  onResponseChange?: (response: WaitlistJoinResponse | null) => void;
  spotsRemaining: number | null;
  variant: "dark" | "light";
};

const WAITLIST_FORM_ACTION = "/api/waitlist";

export function WaitlistEmailForm(props: WaitlistEmailFormProps) {
  const { botDetectionConfig, onResponseChange, spotsRemaining, variant } = props;
  const fetcher = useFetcher<WaitlistJoinResponse>();
  const [email, setEmail] = useState("");
  const response = fetcher.data ?? null;
  const {
    botDetectionToken,
    botDetectionWidget,
    isAwaitingChallenge,
    resetChallenge,
    submit,
  } = useBotDetectionSubmission({
    action: WAITLIST_FORM_ACTION,
    botDetectionConfig,
    fetcher,
  });
  const isSubmitting = fetcher.state !== "idle" || isAwaitingChallenge;
  const isFull = spotsRemaining === 0;
  const isSubmitted = response?.success === true;
  const error = resolveWaitlistError(response);
  const submitLabel = isFull ? "Notify me" : "Join the list";
  const loadingLabel = isFull ? "Joining the notify list" : "Joining the list";
  const inputClassName = cn(
    inputClasses({ controlSize: "lg", variant: variant === "dark" ? "inverted" : "default" }),
    "block h-14 rounded-pill px-6 py-0 text-base focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:opacity-50",
    {
      "!shadow-none border-control-border-soft placeholder:text-placeholder-soft disabled:bg-surface-base disabled:placeholder:text-placeholder-soft":
        variant === "light",
    },
  );
  const buttonClassName = cn(
    buttonVariants({ size: "lg", variant: "primary" }),
    "block h-14 min-w-max border-0 px-8 !text-base font-semibold leading-6 !shadow-none transition-all active:scale-[0.98] disabled:!bg-brand-primary disabled:!text-text-inverted disabled:opacity-50",
    "whitespace-nowrap",
  );

  useEffect(() => {
    onResponseChange?.(response);
  }, [onResponseChange, response]);

  useEffect(() => {
    if (!response) {
      return;
    }

    if (response.success && response.pricing === "reduced") {
      launchWaitlistConfetti();
    }
  }, [response]);

  useEffect(() => {
    if (fetcher.state !== "idle" || !response || response.success) {
      return;
    }

    resetChallenge();
  }, [fetcher.state, resetChallenge, response]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(event.currentTarget);
  }

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

  return (
    <div className="mx-auto w-full max-w-lg">
      <fetcher.Form
        action={WAITLIST_FORM_ACTION}
        className="relative flex flex-col gap-3 md:flex-row"
        method="post"
        noValidate
        onSubmit={handleSubmit}
      >
        <label className="ui-sr-only" htmlFor="waitlist-email">
          Email address
        </label>
        <input
          aria-describedby={error ? "waitlist-email-error" : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete="email"
          className={inputClassName}
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
        />
        <input
          data-testid="bot-detection-response"
          name={TURNSTILE_RESPONSE_FIELD}
          readOnly
          type="hidden"
          value={botDetectionToken}
        />
        <button
          aria-label={isSubmitting ? loadingLabel : undefined}
          className={buttonClassName}
          disabled={isSubmitting || !email.trim()}
          type="submit"
        >
          {isSubmitting ? (
            <Loader2 aria-hidden="true" className="mx-auto animate-spin" size={20} />
          ) : (
            submitLabel
          )}
        </button>
        <div className="absolute size-0 overflow-hidden">{botDetectionWidget}</div>
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
      className={cn("mt-3 flex items-start justify-center gap-2 text-sm leading-snug", {
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
    return <span>{resolveWaitlistErrorMessage(error)}</span>;
  }

  return (
    <span>
      {resolveWaitlistErrorMessage(error)} — or email{" "}
      <a
        className="underline underline-offset-2 hover:no-underline"
        href={`mailto:${ELI_COACH_CONTACT_EMAIL}`}
      >
        {ELI_COACH_CONTACT_EMAIL}
      </a>{" "}
      if it keeps happening.
    </span>
  );
}
