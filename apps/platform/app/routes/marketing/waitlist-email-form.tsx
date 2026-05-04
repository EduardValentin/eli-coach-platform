import type { WaitlistJoinResponse } from "@eli-coach-platform/contracts";
import { cn, Input } from "@eli-coach-platform/ui";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FetcherWithComponents } from "react-router";

import { resolveWaitlistErrorMessage } from "./waitlist-client";
import { launchWaitlistConfetti } from "./waitlist-confetti";

type WaitlistEmailFormProps = {
  fetcher: FetcherWithComponents<unknown>;
  response: WaitlistJoinResponse | null;
  spotsRemaining: number | null;
  variant: "dark" | "light";
};

export function WaitlistEmailForm(props: WaitlistEmailFormProps) {
  const { fetcher, response, spotsRemaining, variant } = props;
  const [email, setEmail] = useState("");
  const isSubmitting = fetcher.state !== "idle";
  const hasFullResponse = response?.success === false && response.error.code === "spots_full";
  const isFull = spotsRemaining === 0 || hasFullResponse;
  const isSubmitted = response?.success === true;
  const errorMessage = hasFullResponse ? null : resolveWaitlistErrorMessage(response);

  useEffect(() => {
    if (!response) {
      return;
    }

    if (response.success && response.intent === "joined") {
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
        <fetcher.Form action="/api/waitlist" className="flex flex-col gap-3 md:flex-row" method="post">
          <input name="intent" type="hidden" value="notify" />
          <label className="ui-sr-only" htmlFor="waitlist-email">
            Email address
          </label>
          <Input
            aria-describedby={errorMessage ? "waitlist-email-error" : undefined}
            aria-invalid={errorMessage ? true : undefined}
            className="min-h-[var(--size-control-lg)] rounded-pill px-6"
            disabled={isSubmitting}
            id="waitlist-email"
            name="email"
            onChange={(event) => {
              setEmail(event.target.value);
            }}
            placeholder="Enter your email"
            required
            type="email"
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
        {errorMessage ? (
          <p
            className={cn("mt-3 rounded-md px-3 py-2 text-center text-body-sm font-medium", {
              "bg-feedback-danger/80 text-text-inverted": variant === "dark",
              "text-feedback-danger": variant === "light",
            })}
            id="waitlist-email-error"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <fetcher.Form action="/api/waitlist" className="flex flex-col gap-3 md:flex-row" method="post">
        <label className="ui-sr-only" htmlFor="waitlist-email">
          Email address
        </label>
        <Input
          aria-describedby={errorMessage ? "waitlist-email-error" : undefined}
          aria-invalid={errorMessage ? true : undefined}
          className="min-h-[var(--size-control-lg)] rounded-pill px-6"
          disabled={isSubmitting}
          id="waitlist-email"
          name="email"
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          placeholder="Enter your email"
          required
          type="email"
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
      {errorMessage ? (
        <p
          className={cn("mt-3 rounded-md px-3 py-2 text-center text-body-sm font-medium", {
            "bg-feedback-danger/80 text-text-inverted": variant === "dark",
            "text-feedback-danger": variant === "light",
          })}
          id="waitlist-email-error"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
