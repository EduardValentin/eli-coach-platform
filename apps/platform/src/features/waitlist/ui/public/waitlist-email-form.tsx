import {
  ELI_COACH_CONTACT_EMAIL,
  EVOA_FITNESS_PRIVACY_EMAIL,
  WAITLIST_MARKETING_CONSENT,
} from "@eli-coach-platform/content";
import type { WaitlistAvailability } from "~/features/waitlist/contracts/waitlist";
import { buttonVariants, cn, inputClasses, Link } from "@eli-coach-platform/ui";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useId, useState } from "react";

import {
  BotDetectionWidget,
  TURNSTILE_RESPONSE_FIELD,
  type BotDetectionRuntimeState,
} from "@eli-coach-platform/infrastructure/bot-detection";

import {
  resolveWaitlistErrorMessage,
  type WaitlistClientError,
} from "./waitlist-client";
import { WAITLIST_API_URL } from "./waitlist-query";
import { useWaitlistSubmission } from "./waitlist-submission";

type WaitlistEmailFormProps = {
  availability: WaitlistAvailability | null;
  botDetection: BotDetectionRuntimeState;
  variant: "dark" | "light";
};

export function WaitlistEmailForm(props: WaitlistEmailFormProps) {
  const { availability, botDetection, variant } = props;
  const [email, setEmail] = useState("");
  const errorId = useId();
  const submission = useWaitlistSubmission(botDetection);
  const isClosed = availability === "closed";
  const submitLabel = isClosed ? "Notify me" : "Join the list";
  const loadingLabel = isClosed ? "Joining the notify list" : "Joining the list";
  const inputClassName = cn(
    inputClasses({ controlSize: "lg", variant: variant === "dark" ? "inverted" : "default" }),
    "block h-14 rounded-pill px-6 py-0 text-base focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:!outline-none aria-invalid:!outline-none",
    {
      "!shadow-none border-control-border-soft placeholder:text-placeholder-soft aria-invalid:!border-control-border-soft disabled:bg-surface-base disabled:text-text-primary disabled:placeholder:text-placeholder-soft":
        variant === "light",
      "border-surface-base/20 bg-surface-base/10 aria-invalid:!border-surface-base/20 disabled:bg-surface-base/10 disabled:text-text-inverted":
        variant === "dark",
    },
  );
  const buttonClassName = cn(
    buttonVariants({ size: "lg", variant: "primary" }),
    "block h-14 min-w-max border-0 px-8 !text-base !text-text-inverted font-semibold leading-6 !shadow-none transition-all ease-in-out hover:!bg-waitlist-button-hover active:!bg-waitlist-button-hover active:scale-[0.98] disabled:!bg-brand-primary disabled:!text-text-inverted disabled:opacity-50",
    "whitespace-nowrap",
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submission.submitForm(event.currentTarget);
  }

  if (submission.isSubmitted) {
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
        className="relative flex flex-col gap-3"
        method="post"
        noValidate
        onSubmit={handleSubmit}
      >
        <p className="text-body-sm leading-snug">
          <span
            className={cn({
              "text-text-inverted/70": variant === "dark",
              "text-text-secondary": variant === "light",
            })}
          >
            {WAITLIST_MARKETING_CONSENT.beforePrivacyEmail}
            <a
              className="font-medium underline underline-offset-2 hover:no-underline"
              href={`mailto:${EVOA_FITNESS_PRIVACY_EMAIL}`}
            >
              {EVOA_FITNESS_PRIVACY_EMAIL}
            </a>
            {WAITLIST_MARKETING_CONSENT.betweenPrivacyEmailAndPolicyLink}
            <Link
              className={cn("underline underline-offset-2 hover:no-underline", {
                "text-text-inverted hover:text-text-inverted": variant === "dark",
              })}
              reloadDocument
              to="/privacy"
            >
              {WAITLIST_MARKETING_CONSENT.privacyPolicyLinkLabel}
            </Link>
            {WAITLIST_MARKETING_CONSENT.afterPrivacyPolicyLink}
          </span>
        </p>
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="block min-w-0 flex-1">
            <span className="ui-sr-only">Email address</span>
            <input
              aria-describedby={submission.error ? errorId : undefined}
              aria-invalid={submission.error ? true : undefined}
              autoComplete="email"
              className={inputClassName}
              disabled={submission.isSubmitting}
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
            value={submission.botDetectionToken}
          />
          <button
            aria-label={submission.isSubmitting ? loadingLabel : undefined}
            className={buttonClassName}
            disabled={
              !submission.botDetectionIsReady ||
              submission.isSubmitting ||
              !email.trim()
            }
            type="submit"
          >
            {submission.isSubmitting ? (
              <Loader2 aria-hidden="true" className="mx-auto animate-spin" size={20} />
            ) : (
              submitLabel
            )}
          </button>
        </div>
        <div className="absolute size-0 overflow-hidden">
          {submission.botDetectionWidgetProps ? (
            <BotDetectionWidget {...submission.botDetectionWidgetProps} />
          ) : null}
        </div>
      </form>
      <WaitlistErrorAlert
        botDetectionError={submission.botDetectionError}
        error={submission.error}
        errorId={errorId}
        variant={variant}
      />
    </div>
  );
}

function WaitlistErrorAlert(props: {
  botDetectionError: string | null;
  error: WaitlistClientError | null;
  errorId: string;
  variant: "dark" | "light";
}) {
  const { botDetectionError, error, errorId, variant } = props;

  if (!botDetectionError && !error) {
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
        {botDetectionError ? (
          botDetectionError
        ) : error ? (
          <WaitlistErrorContent error={error} />
        ) : null}
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
