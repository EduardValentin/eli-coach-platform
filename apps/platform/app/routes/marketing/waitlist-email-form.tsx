import type { WaitlistJoinResponse } from "@eli-coach-platform/contracts";
import { cn, Input } from "@eli-coach-platform/ui";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FetcherWithComponents } from "react-router";

import { resolveWaitlistError, type WaitlistClientError } from "./waitlist-client";
import { launchWaitlistConfetti } from "./waitlist-confetti";

type WaitlistEmailFormProps = {
  fetcher: FetcherWithComponents<unknown>;
  response: WaitlistJoinResponse | null;
  spotsRemaining: number | null;
  variant: "dark" | "light";
};

const CONTACT_EMAIL = "contact@elipersonaltrainer.com";

export function WaitlistEmailForm(props: WaitlistEmailFormProps) {
  const { fetcher, response, spotsRemaining, variant } = props;
  const [email, setEmail] = useState("");
  const isSubmitting = fetcher.state !== "idle";
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
          action="/api/waitlist"
          className="flex flex-col gap-3 md:flex-row"
          method="post"
          noValidate
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
        </fetcher.Form>
        <WaitlistErrorAlert error={error} variant={variant} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <fetcher.Form
        action="/api/waitlist"
        className="flex flex-col gap-3 md:flex-row"
        method="post"
        noValidate
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
