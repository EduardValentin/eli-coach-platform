import { ELI_COACH_CONTACT_EMAIL } from "@eli-coach-platform/content";
import { buttonVariants, cn, inputClasses } from "@eli-coach-platform/ui";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";

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
import { useJoinWaitlistMutation, WAITLIST_API_URL } from "./waitlist-query";

type WaitlistEmailFormProps = {
  botDetectionConfig: BotDetectionConfig;
  spotsRemaining: number | null;
  variant: "dark" | "light";
};

export function WaitlistEmailForm(props: WaitlistEmailFormProps) {
  const { botDetectionConfig, spotsRemaining, variant } = props;
  const mutation = useJoinWaitlistMutation();
  const { mutate } = mutation;
  const [email, setEmail] = useState("");
  const errorId = useId();
  const response = mutation.data ?? null;
  const {
    botDetectionToken,
    botDetectionWidget,
    isAwaitingChallenge,
    resetChallenge,
    submit,
  } = useBotDetectionSubmission({
    botDetectionConfig,
    onSubmitFormData: mutate,
  });
  const isSubmitting = mutation.isPending || isAwaitingChallenge;
  const isFull = spotsRemaining === 0;
  const isSubmitted = response?.success === true;
  const error = resolveWaitlistError(response);
  const submitLabel = isFull ? "Notify me" : "Join the list";
  const loadingLabel = isFull ? "Joining the notify list" : "Joining the list";
  const inputClassName = cn(
    inputClasses({ controlSize: "lg", variant: variant === "dark" ? "inverted" : "default" }),
    "block h-14 rounded-pill px-6 py-0 text-base focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:!outline-none aria-invalid:!outline-none",
    {
      "!shadow-none border-control-border-soft placeholder:text-placeholder-soft aria-invalid:!border-control-border-soft disabled:bg-surface-base disabled:text-text-primary disabled:placeholder:text-placeholder-soft":
        variant === "light",
      "aria-invalid:!border-surface-base/30 disabled:bg-surface-base/15 disabled:text-text-inverted":
        variant === "dark",
    },
  );
  const buttonClassName = cn(
    buttonVariants({ size: "lg", variant: "primary" }),
    "block h-14 min-w-max border-0 px-8 !text-base !text-text-inverted font-semibold leading-6 !shadow-none transition-all ease-in-out hover:!bg-waitlist-button-hover active:!bg-waitlist-button-hover active:scale-[0.98] disabled:!bg-brand-primary disabled:!text-text-inverted disabled:opacity-50",
    "whitespace-nowrap",
  );

  useEffect(() => {
    if (!response) {
      return;
    }

    if (response.success && response.pricing === "reduced") {
      launchWaitlistConfetti();
    }
  }, [response]);

  useEffect(() => {
    if (mutation.isPending || !response || response.success) {
      return;
    }

    resetChallenge();
  }, [mutation.isPending, resetChallenge, response]);

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
            className={cn("font-heading text-lg font-medium leading-7", {
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
      <form
        action={WAITLIST_API_URL}
        className="relative flex flex-col gap-3 md:flex-row"
        method="post"
        noValidate
        onSubmit={handleSubmit}
      >
        <label className="block min-w-0 flex-1">
          <span className="ui-sr-only">Email address</span>
          <input
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? true : undefined}
            autoComplete="email"
            className={inputClassName}
            disabled={isSubmitting}
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
        </label>
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
      </form>
      <WaitlistErrorAlert error={error} errorId={errorId} variant={variant} />
    </div>
  );
}

function WaitlistErrorAlert(props: {
  error: WaitlistClientError | null;
  errorId: string;
  variant: "dark" | "light";
}) {
  const { error, errorId, variant } = props;

  if (!error) {
    return null;
  }

  return (
    <div
      className={cn("mt-3 flex items-start justify-center gap-2 text-sm leading-snug", {
        "text-feedback-danger": variant === "light",
        "text-feedback-danger-on-inverted": variant === "dark",
      })}
      id={errorId}
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
