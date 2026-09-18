import {
  ELI_COACH_CONTACT_EMAIL,
  EVOA_FITNESS_PRIVACY_EMAIL,
  WAITLIST_MARKETING_CONSENT,
} from "@eli-coach-platform/content";
import type { WaitlistPresentation } from "~/features/waitlist/ui/shared/waitlist-presentation";
import { cn } from "@eli-coach-platform/ui/lib";
import {
  publicEaseOut,
  useClientReducedMotionPreference,
} from "@eli-coach-platform/ui/motion";
import { Button } from "@eli-coach-platform/ui/primitives";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
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
  variant: WaitlistFormVariant;
};

type WaitlistFormVariant = "dark" | "light";

const emailFieldClassName =
  "h-14 w-full rounded-full border px-6 text-base outline-none transition-all";
const consentLinkClassName =
  "font-medium underline underline-offset-2 hover:no-underline";

export function WaitlistEmailForm(props: WaitlistEmailFormProps) {
  const { botDetection, mode, variant } = props;
  const [email, setEmail] = useState("");
  const errorId = useId();
  const submission = useWaitlistSubmission(botDetection);
  const isDark = variant === "dark";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submission.submitForm(event.currentTarget);
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto w-full max-w-lg">
        <AnimatePresence mode="wait">
          {submission.isSubmitted ? (
            <WaitlistJoinedMessage key="success" variant={variant} />
          ) : (
            <motion.form
              action={WAITLIST_API_URL}
              className="flex flex-col gap-3"
              exit={{ opacity: 0, scale: 0.95 }}
              key="form"
              method="post"
              noValidate
              onSubmit={handleSubmit}
              transition={{ duration: 0.2 }}
            >
              <WaitlistConsentNotice variant={variant} />
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
                <Button
                  aria-label={
                    submission.isSubmitting
                      ? waitlistLoadingLabel(mode)
                      : undefined
                  }
                  className="hover:bg-waitlist-button-hover"
                  disabled={submission.isSubmitting || !email.trim()}
                  label="strong"
                  press="scale"
                  size="cta-lg"
                  type="submit"
                >
                  <WaitlistSubmitLabel
                    isSubmitting={submission.isSubmitting}
                    mode={mode}
                  />
                </Button>
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
          variant={variant}
        />
      </div>
    </MotionConfig>
  );
}

function waitlistLoadingLabel(mode: WaitlistPresentation["mode"]): string {
  return mode === "closed" ? "Joining the notify list" : "Joining the list";
}

function WaitlistJoinedMessage(props: { variant: WaitlistFormVariant }) {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-3 py-2"
      initial={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: publicEaseOut }}
    >
      <CheckCircle2
        aria-hidden="true"
        className="text-brand-secondary"
        size={36}
        strokeWidth={1.5}
      />
      <p
        className={cn("font-heading text-lg font-medium", {
          "text-text-inverted": props.variant === "dark",
          "text-text-primary": props.variant === "light",
        })}
      >
        You're in. Keep an eye on your inbox.
      </p>
    </motion.div>
  );
}

function WaitlistConsentNotice(props: { variant: WaitlistFormVariant }) {
  return (
    <p
      className={cn("text-sm leading-snug", {
        "text-text-inverted/70": props.variant === "dark",
        "text-copy-muted": props.variant === "light",
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
      <Link className={consentLinkClassName} reloadDocument to="/privacy">
        {WAITLIST_MARKETING_CONSENT.privacyPolicyLinkLabel}
      </Link>
      {WAITLIST_MARKETING_CONSENT.afterPrivacyPolicyLink}
    </p>
  );
}

function WaitlistSubmitLabel(props: {
  isSubmitting: boolean;
  mode: WaitlistPresentation["mode"];
}) {
  const shouldReduceMotion = useClientReducedMotionPreference();

  if (!props.isSubmitting) {
    return props.mode === "closed" ? "Notify me" : "Join the list";
  }

  if (shouldReduceMotion) {
    return <span>{waitlistLoadingLabel(props.mode)}…</span>;
  }

  return (
    <Loader2 aria-hidden="true" className="mx-auto animate-spin" size={20} />
  );
}

function WaitlistErrorAlert(props: {
  botDetectionError: string | null;
  error: WaitlistClientError | null;
  errorId: string;
  variant: WaitlistFormVariant;
}) {
  const { botDetectionError, error, errorId, variant } = props;
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
          exit={{ opacity: 0, y: -4 }}
          id={errorId}
          initial={{ opacity: 0, y: -4 }}
          role="alert"
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
