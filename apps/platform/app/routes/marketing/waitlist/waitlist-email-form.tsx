import type { WaitlistJoinResponse } from "@eli-coach-platform/contracts";
import { ELI_COACH_CONTACT_EMAIL } from "@eli-coach-platform/content";
import { cn } from "@eli-coach-platform/ui";
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
  const inputClassName =
    variant === "dark"
      ? "h-14 w-full rounded-full border border-white/20 bg-white/10 px-6 text-base text-white outline-none backdrop-blur-md transition-all placeholder:text-white/50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
      : "h-14 w-full rounded-full border border-neutral-200 bg-white px-6 text-base text-text-primary outline-none transition-all placeholder:text-neutral-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 disabled:cursor-not-allowed disabled:opacity-50";
  const buttonClassName =
    "h-14 rounded-full bg-brand-primary px-8 font-semibold whitespace-nowrap text-white transition-all hover:bg-[#a61757] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

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
  const colorClassName =
    variant === "light" ? "text-feedback-danger" : "text-feedback-danger-on-inverted";

  if (!error) {
    return null;
  }

  return (
    <div
      className={`mt-3 flex items-start justify-center gap-2 text-sm leading-snug ${colorClassName}`}
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
