import { zodResolver } from "@hookform/resolvers/zod";
import { ELI_COACH_CONTACT_EMAIL } from "@eli-coach-platform/content";
import { BotDetectionWidget } from "@eli-coach-platform/infrastructure/bot-detection";
import { cn } from "@eli-coach-platform/ui/lib";
import { Button, Input, inputClasses } from "@eli-coach-platform/ui/primitives";
import type { ReactNode } from "react";
import { useId } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";

import type { BookingClientError } from "./booking-flow";
import { formatCallMoment } from "./slot-grouping";
import type { BookAssessmentCallSubmission } from "./submission";

const NAME_ERROR = "Enter your full name, between 2 and 120 characters.";

const bookingDetailsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  fullName: z.string().trim().min(2, NAME_ERROR).max(120, NAME_ERROR),
  notes: z.string().max(1000, "Keep your note under 1000 characters."),
});

export type BookingDetails = z.infer<typeof bookingDetailsSchema>;

type BookingDetailsFormProps = {
  call: { startsAt: string; timeZone: string };
  error: BookingClientError | null;
  onBack: () => void;
  onSubmit: (details: BookingDetails) => void;
  submission: BookAssessmentCallSubmission;
};

export function BookingDetailsForm(props: BookingDetailsFormProps) {
  const { call, error, onBack, onSubmit, submission } = props;
  const fields = useId();
  const nameId = `${fields}-full-name`;
  const emailId = `${fields}-email`;
  const notesId = `${fields}-notes`;
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<BookingDetails>({
    defaultValues: { email: "", fullName: "", notes: "" },
    resolver: zodResolver(bookingDetailsSchema),
  });
  const submitDetails: SubmitHandler<BookingDetails> = (details) => {
    onSubmit(details);
  };

  return (
    <section className="max-w-2xl rounded-md border border-stroke-faint bg-surface-base p-6 shadow-soft md:p-10">
      <h2 className="mb-2 font-heading text-2xl leading-heading text-text-primary">
        Your details
      </h2>
      <p className="mb-8 text-copy-muted">
        Your call: {formatCallMoment(new Date(call.startsAt), call.timeZone)}
      </p>

      <BookingErrorAlert
        botDetectionError={submission.botDetectionError}
        error={error}
        timeZone={call.timeZone}
      />

      <form
        className="relative space-y-6"
        noValidate
        onSubmit={handleSubmit(submitDetails)}
      >
        <BookingField
          error={errors.fullName?.message}
          htmlFor={nameId}
          label="Full name"
        >
          <Input
            aria-describedby={errors.fullName ? `${nameId}-error` : undefined}
            aria-invalid={errors.fullName ? true : undefined}
            autoComplete="name"
            controlSize="lg"
            id={nameId}
            type="text"
            {...register("fullName")}
          />
        </BookingField>

        <BookingField
          error={errors.email?.message}
          htmlFor={emailId}
          label="Email address"
        >
          <Input
            aria-describedby={errors.email ? `${emailId}-error` : undefined}
            aria-invalid={errors.email ? true : undefined}
            autoComplete="email"
            controlSize="lg"
            id={emailId}
            inputMode="email"
            type="text"
            {...register("email")}
          />
        </BookingField>

        <BookingField
          error={errors.notes?.message}
          htmlFor={notesId}
          label="Anything to share beforehand? (Optional)"
        >
          <textarea
            aria-describedby={errors.notes ? `${notesId}-error` : undefined}
            aria-invalid={errors.notes ? true : undefined}
            className={cn(inputClasses(), "h-28 resize-none")}
            id={notesId}
            rows={4}
            {...register("notes")}
          />
        </BookingField>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Button
            aria-busy={submission.isSubmitting || undefined}
            disabled={submission.isSubmitting}
            size="lg"
            type="submit"
          >
            Book my call
          </Button>
          <button
            className="min-h-11 text-body-sm font-semibold text-brand-primary underline underline-offset-4 outline-none hover:no-underline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
            onClick={onBack}
            type="button"
          >
            Back to the times
          </button>
        </div>

        <div className="absolute size-0 overflow-hidden">
          <BotDetectionWidget {...submission.botDetectionWidgetProps} />
        </div>
      </form>
    </section>
  );
}

function BookingField(props: {
  children: ReactNode;
  error: string | undefined;
  htmlFor: string;
  label: string;
}) {
  const { children, error, htmlFor, label } = props;

  return (
    <div className="space-y-2">
      <label
        className="block text-body-sm font-medium text-text-primary"
        htmlFor={htmlFor}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p
          className="text-body-sm text-feedback-danger"
          id={`${htmlFor}-error`}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function BookingErrorAlert(props: {
  botDetectionError: string | null;
  error: BookingClientError | null;
  timeZone: string;
}) {
  const { botDetectionError, error, timeZone } = props;

  if (!botDetectionError && !error) {
    return null;
  }

  return (
    <div
      className="mb-8 rounded-sm border border-feedback-danger/30 bg-feedback-danger-soft px-4 py-3 text-body-sm text-feedback-danger"
      role="alert"
    >
      <p>{botDetectionError ?? error?.message}</p>
      {error?.existing ? (
        <p className="mt-2">
          It is on{" "}
          {formatCallMoment(new Date(error.existing.startsAt), timeZone)}.{" "}
          <Link
            className="font-semibold underline underline-offset-2 hover:no-underline"
            to={error.existing.joinPath}
          >
            Join your call
          </Link>
        </p>
      ) : null}
      {error?.code === "server_error" ? (
        <p className="mt-2">
          If it keeps failing, email{" "}
          <a
            className="font-semibold underline underline-offset-2 hover:no-underline"
            href={`mailto:${ELI_COACH_CONTACT_EMAIL}`}
          >
            {ELI_COACH_CONTACT_EMAIL}
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}
