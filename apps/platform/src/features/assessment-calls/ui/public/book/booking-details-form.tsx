import { zodResolver } from "@hookform/resolvers/zod";
import { ELI_COACH_CONTACT_EMAIL } from "@eli-coach-platform/content";
import { BotDetectionWidget } from "@eli-coach-platform/infrastructure/bot-detection";
import {
  Alert,
  Button,
  IconButton,
  Input,
  Label,
  Textarea,
} from "@eli-coach-platform/ui/primitives";
import { ChevronLeft, Mail, User, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode, Ref } from "react";
import { useId } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";

import type { BookingClientError, BookingDetails } from "./booking-flow";
import type { BookAssessmentCallSubmission } from "./submission";

const SUPPORT_CONTACT_CODES: ReadonlySet<BookingClientError["code"]> = new Set([
  "booking_refused",
  "server_error",
]);

const NAME_ERROR = "Enter your full name, between 2 and 120 characters.";
const EMAIL_ERROR = "Enter a valid email address.";

const bookingDetailsSchema = z.object({
  email: z.string().trim().max(320, EMAIL_ERROR).email(EMAIL_ERROR),
  fullName: z.string().trim().min(2, NAME_ERROR).max(120, NAME_ERROR),
  notes: z.string().trim().max(1000, "Keep your note under 1000 characters."),
}) satisfies z.ZodType<BookingDetails>;

type BookingDetailsFormProps = {
  enteredDetails: BookingDetails;
  error: BookingClientError | null;
  headingRef: Ref<HTMLHeadingElement>;
  onBack: (details: BookingDetails) => void;
  onSubmit: (details: BookingDetails) => void;
  submission: BookAssessmentCallSubmission;
};

export function BookingDetailsForm(props: BookingDetailsFormProps) {
  const { enteredDetails, error, headingRef, onBack, onSubmit, submission } =
    props;
  const fields = useId();
  const nameId = `${fields}-full-name`;
  const emailId = `${fields}-email`;
  const notesId = `${fields}-notes`;
  const {
    formState: { errors },
    getValues,
    handleSubmit,
    register,
  } = useForm<BookingDetails>({
    defaultValues: enteredDetails,
    resolver: zodResolver(bookingDetailsSchema),
  });
  const submitDetails: SubmitHandler<BookingDetails> = (details) => {
    onSubmit(details);
  };

  return (
    <>
      <IconButton
        aria-label="Back to the times"
        className="mb-6 -ml-2"
        onClick={() => onBack(getValues())}
        variant="soft"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </IconButton>

      <h2
        className="mb-2 scroll-mt-24 text-2xl font-semibold text-text-primary"
        ref={headingRef}
        tabIndex={-1}
      >
        Almost there
      </h2>
      <p className="mb-8 font-medium text-text-secondary">
        Please provide your details to secure your slot.
      </p>

      <BookingErrorAlert
        botDetectionError={submission.botDetectionError}
        error={error}
      />

      <form
        className="flex-1 space-y-5"
        noValidate
        onSubmit={handleSubmit(submitDetails)}
      >
        <div className="absolute size-0 overflow-hidden">
          <BotDetectionWidget {...submission.botDetectionWidgetProps} />
        </div>

        <BookingField
          error={errors.fullName?.message}
          htmlFor={nameId}
          icon={User}
          label="Full Name"
        >
          <Input
            aria-describedby={errors.fullName ? `${nameId}-error` : undefined}
            aria-invalid={errors.fullName ? true : undefined}
            autoComplete="name"
            className="pl-9"
            id={nameId}
            placeholder="Jane Doe"
            type="text"
            {...register("fullName")}
          />
        </BookingField>

        <BookingField
          error={errors.email?.message}
          htmlFor={emailId}
          icon={Mail}
          label="Email Address"
        >
          <Input
            aria-describedby={errors.email ? `${emailId}-error` : undefined}
            aria-invalid={errors.email ? true : undefined}
            autoComplete="email"
            className="pl-9"
            id={emailId}
            inputMode="email"
            placeholder="jane@example.com"
            type="text"
            {...register("email")}
          />
        </BookingField>

        <BookingField
          error={errors.notes?.message}
          htmlFor={notesId}
          label="Anything to share beforehand? (Optional)"
        >
          <Textarea
            aria-describedby={errors.notes ? `${notesId}-error` : undefined}
            aria-invalid={errors.notes ? true : undefined}
            className="h-24"
            id={notesId}
            placeholder="e.g. recovering from a knee injury"
            {...register("notes")}
          />
        </BookingField>

        <div className="pt-4">
          <Button
            aria-busy={submission.isSubmitting || undefined}
            className="w-full"
            disabled={submission.isSubmitting}
            label="strong"
            type="submit"
          >
            {submission.isSubmitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  aria-hidden="true"
                  className="size-5 rounded-full border-2 border-text-inverted/30 border-t-text-inverted"
                  transition={{
                    duration: 1,
                    ease: "linear",
                    repeat: Infinity,
                  }}
                />
                <span className="sr-only">Scheduling your assessment</span>
              </>
            ) : (
              "Schedule Assessment"
            )}
          </Button>
        </div>
      </form>
    </>
  );
}

function BookingField(props: {
  children: ReactNode;
  error: string | undefined;
  htmlFor: string;
  icon?: LucideIcon;
  label: string;
}) {
  const { children, error, htmlFor, icon: Icon, label } = props;

  return (
    <div className="space-y-2">
      <Label className="font-medium text-text-label" htmlFor={htmlFor}>
        {label}
      </Label>
      {Icon ? (
        <div className="relative">
          <Icon
            aria-hidden="true"
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary"
          />
          {children}
        </div>
      ) : (
        children
      )}
      {error ? (
        <p
          className="text-sm font-medium text-feedback-danger"
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
}) {
  const { botDetectionError, error } = props;

  if (!botDetectionError && !error) {
    return null;
  }

  return (
    <Alert className="mb-6">
      <p>{botDetectionError ?? error?.message}</p>
      {error && SUPPORT_CONTACT_CODES.has(error.code) ? (
        <p className="mt-2">
          If it keeps failing, email{" "}
          <a
            className="font-semibold underline underline-offset-2"
            href={`mailto:${ELI_COACH_CONTACT_EMAIL}`}
          >
            {ELI_COACH_CONTACT_EMAIL}
          </a>
          .
        </p>
      ) : null}
    </Alert>
  );
}
