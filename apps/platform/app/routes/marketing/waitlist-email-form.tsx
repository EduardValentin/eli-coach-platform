import { Button, cn, Input } from "@eli-coach-platform/ui";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import { parseWaitlistJoinResponse, resolveWaitlistErrorMessage } from "./waitlist-client";
import { WaitlistToast } from "./waitlist-toast";

type WaitlistEmailFormProps = {
  cap: number;
  spotsRemaining: number | null;
  variant: "dark" | "light";
  onSpotsRemainingChange?: (spotsRemaining: number) => void;
};

export function WaitlistEmailForm(props: WaitlistEmailFormProps) {
  const { onSpotsRemainingChange, spotsRemaining, variant } = props;
  const fetcher = useFetcher();
  const [email, setEmail] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const response = parseWaitlistJoinResponse(fetcher.data);
  const isSubmitting = fetcher.state !== "idle";
  const hasFullResponse = response?.success === false && response.error.code === "spots_full";
  const isSoldOut = spotsRemaining === 0 || hasFullResponse;
  const isSubmitted = response?.success === true;
  const errorMessage = resolveWaitlistErrorMessage(fetcher.data);

  useEffect(() => {
    const parsedResponse = parseWaitlistJoinResponse(fetcher.data);

    if (!parsedResponse) {
      return;
    }

    if (parsedResponse.success) {
      onSpotsRemainingChange?.(parsedResponse.spotsRemaining);
      setToastMessage("You're on the list. We'll be in touch soon.");
      return;
    }

    if (parsedResponse.error.code === "spots_full") {
      onSpotsRemainingChange?.(0);
    }
  }, [fetcher.data, onSpotsRemainingChange]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

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
        <WaitlistToast message={toastMessage} />
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
          className={cn("min-h-[var(--size-control-lg)] rounded-pill px-6", {
            "border-surface-base/20 bg-surface-base/10 text-text-inverted shadow-none placeholder:text-text-inverted/60 focus-visible:border-brand-primary":
              variant === "dark",
          })}
          disabled={isSubmitting || isSoldOut}
          id="waitlist-email"
          name="email"
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          placeholder="Enter your email"
          required
          type="email"
          value={email}
        />
        <Button
          className="min-h-[var(--size-control-lg)] shrink-0 px-8"
          disabled={isSubmitting || isSoldOut || !email.trim()}
          size="lg"
          type="submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin" size={20} />
              Joining
            </>
          ) : (
            "Join the list"
          )}
        </Button>
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
      <WaitlistToast message={toastMessage} />
    </div>
  );
}
