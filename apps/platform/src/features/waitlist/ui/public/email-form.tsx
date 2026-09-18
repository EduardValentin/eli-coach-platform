import {
  ELI_COACH_CONTACT_EMAIL,
  EVOA_FITNESS_PRIVACY_EMAIL,
  WAITLIST_MARKETING_CONSENT,
} from "@eli-coach-platform/content";
import type { WaitlistPresentation } from "~/features/waitlist/ui/shared/waitlist-presentation";
import { cn } from "@eli-coach-platform/ui/lib";
import { useClientReducedMotionPreference } from "@eli-coach-platform/ui/motion";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { FormEvent } from "react";
import { useId, useState } from "react";
import { Link } from "react-router";

import {
  BotDetectionWidget,
  TURNSTILE_RESPONSE_FIELD,
  type BotDetectionConfig,
} from "@eli-coach-platform/infrastructure/bot-detection";

import {
  resolveWaitlistErrorMessage,
  type WaitlistClientError,
} from "./errors";
import { WAITLIST_API_URL } from "./api-client";
import { useWaitlistSubmission } from "./submission";

type WaitlistEmailFormProps = {
  botDetection: BotDetectionConfig;
  mode: WaitlistPresentation["mode"];
  variant: "dark" | "light";
};

const successEase = [0.16, 1, 0.3, 1] as const;
const emailFieldClassName =
  "h-14 w-full rounded-pill border px-6 text-base outline-none transition-all focus:ring-2 focus:ring-brand-primary/30";
const consentLinkClassName =
  "font-medium underline underline-offset-2 hover:no-underline";

export function WaitlistEmailForm(props: WaitlistEmailFormProps) {
  const { botDetection, mode, variant } = props;
  const [email, setEmail] = useState("");
  const errorId = useId();
  const submission = useWaitlistSubmission(botDetection);
  const shouldReduceMotion = useClientReducedMotionPreference();
  const isClosed = mode === "closed";
  const isDark = variant === "dark";
  const submitLabel = isClosed ? "Notify me" : "Join the list";
  const loadingLabel = isClosed
    ? "Joining the notify list"
    : "Joining the list";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submission.submitForm(event.currentTarget);
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <AnimatePresence mode="wait">
        {submission.isSubmitted ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-2"
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
            key="success"
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.4, ease: successEase }
            }
          >
            <CheckCircle2
              aria-hidden="true"
              className="text-brand-secondary"
              size={36}
              strokeWidth={1.5}
            />
            <p
              className={cn("font-heading text-lg font-medium", {
                "text-text-inverted": isDark,
                "text-text-primary": !isDark,
              })}
            >
              You're in. Keep an eye on your inbox.
            </p>
          </motion.div>
        ) : (
          <motion.form
            action={WAITLIST_API_URL}
            className="flex flex-col gap-3"
            exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.95 }}
            key="form"
            method="post"
            noValidate
            onSubmit={handleSubmit}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          >
            <p
              className={cn("text-sm leading-snug", {
                "text-text-inverted/70": isDark,
                "text-copy-muted": !isDark,
              })}
            >
              {WAITLIST_MARKETING_CONSENT.beforePrivacyEmail.trimEnd()}{" "}
              <a
                className={consentLinkClassName}
                href={`mailto:${EVOA_FITNESS_PRIVACY_EMAIL}`}
              >
                {EVOA_FITNESS_PRIVACY_EMAIL}
              </a>
              {WAITLIST_MARKETING_CONSENT.betweenPrivacyEmailAndPolicyLink.trimEnd()}{" "}
              <Link
                className={consentLinkClassName}
                reloadDocument
                to="/privacy"
              >
                {WAITLIST_MARKETING_CONSENT.privacyPolicyLinkLabel}
              </Link>
              {WAITLIST_MARKETING_CONSENT.afterPrivacyPolicyLink}
            </p>
            <div className="flex flex-col gap-3 md:flex-row">
              <label className="block min-w-0 flex-1">
                <span className="sr-only">Email address</span>
                <input
                  aria-describedby={submission.error ? errorId : undefined}
                  aria-invalid={submission.error ? true : undefined}
                  autoComplete="email"
                  className={cn(emailFieldClassName, {
                    "border-control-border-soft bg-surface-base text-text-primary placeholder:text-placeholder-soft":
                      !isDark,
                    "border-surface-base/20 bg-surface-base/10 text-text-inverted placeholder:text-text-inverted/50 backdrop-blur-md":
                      isDark,
                  })}
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
                className="h-14 whitespace-nowrap rounded-xl bg-brand-primary px-8 font-semibold text-brand-primary-foreground transition-all hover:bg-waitlist-button-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                disabled={submission.isSubmitting || !email.trim()}
                type="submit"
              >
                {submission.isSubmitting ? (
                  shouldReduceMotion ? (
                    <span>{loadingLabel}…</span>
                  ) : (
                    <Loader2
                      aria-hidden="true"
                      className="mx-auto animate-spin"
                      size={20}
                    />
                  )
                ) : (
                  submitLabel
                )}
              </button>
            </div>
            <div className="absolute size-0 overflow-hidden">
              <BotDetectionWidget {...submission.botDetectionWidgetProps} />
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      <WaitlistErrorAlert
        botDetectionError={submission.botDetectionError}
        error={submission.error}
        errorId={errorId}
        shouldReduceMotion={shouldReduceMotion}
        variant={variant}
      />
    </div>
  );
}

function WaitlistErrorAlert(props: {
  botDetectionError: string | null;
  error: WaitlistClientError | null;
  errorId: string;
  shouldReduceMotion: boolean;
  variant: "dark" | "light";
}) {
  const { botDetectionError, error, errorId, shouldReduceMotion, variant } =
    props;
  const hasError = botDetectionError !== null || error !== null;

  return (
    <AnimatePresence>
      {hasError ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mt-3 flex items-start justify-center gap-2 text-sm leading-snug",
            {
              "text-feedback-danger": variant === "light",
              "text-feedback-danger-on-inverted": variant === "dark",
            },
          )}
          exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
          id={errorId}
          initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
          role="alert"
          transition={shouldReduceMotion ? { duration: 0 } : undefined}
        >
          <AlertCircle
            aria-hidden="true"
            className="mt-0.5 shrink-0"
            size={16}
          />
          <p className="text-left">
            {botDetectionError ??
              (error ? <WaitlistErrorContent error={error} /> : null)}
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
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
