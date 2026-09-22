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
import { useId, useState } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type SubmitHandler,
} from "react-hook-form";
import { z } from "zod";

import {
  COUNTRIES,
  findCountry,
} from "~/features/assessment-calls/contracts/countries";
import {
  birthDateMessage,
  BOOKING_FIELD_MESSAGES,
  checkBirthDate,
  MAX_NOTES_LENGTH,
  nameSchema,
  normalizeVisitorPhone,
  VISITOR_GENDER_OPTIONS,
  VISITOR_PRIMARY_GOAL_OPTIONS,
} from "~/features/assessment-calls/contracts/visitor-profile";

import type { BookingClientError, BookingDetails } from "./booking-flow";
import { ChoiceSelectField } from "./choice-select-field";
import { DateOfBirthField } from "./date-of-birth-field";
import { FieldError } from "./field-error";
import { PhoneField } from "./phone-field";
import type { BookAssessmentCallSubmission } from "./submission";

const SUPPORT_CONTACT_CODES: ReadonlySet<BookingClientError["code"]> = new Set([
  "booking_refused",
  "server_error",
]);

const COUNTRY_OPTIONS = COUNTRIES.map((country) => ({
  label: country.name,
  value: country.code,
}));

type BookingMoment = { now: Date; timeZone: string };

function isOneOf(options: readonly { value: string }[]) {
  return (value: string) => options.some((option) => option.value === value);
}

function birthDateProblem(
  dateOfBirth: string,
  moment: BookingMoment,
): string | null {
  if (dateOfBirth.length === 0) {
    return BOOKING_FIELD_MESSAGES.birthDateMissing;
  }

  return birthDateMessage(
    checkBirthDate({ dateOfBirth, on: moment.now, timeZone: moment.timeZone }),
  );
}

function phoneProblem(details: BookingDetails): string | null {
  const phone = normalizeVisitorPhone({
    country: details.phoneCountry,
    nationalNumber: details.phoneNumber,
  });

  return phone.status === "invalid" ? BOOKING_FIELD_MESSAGES.phone : null;
}

function createBookingDetailsSchema(moment: BookingMoment) {
  return z
    .object({
      country: z.string().refine(findCountry, BOOKING_FIELD_MESSAGES.country),
      dateOfBirth: z.string(),
      email: z
        .string()
        .trim()
        .max(320, BOOKING_FIELD_MESSAGES.email)
        .email(BOOKING_FIELD_MESSAGES.email),
      firstName: nameSchema(BOOKING_FIELD_MESSAGES.firstName),
      gender: z
        .string()
        .refine(isOneOf(VISITOR_GENDER_OPTIONS), BOOKING_FIELD_MESSAGES.gender),
      lastName: nameSchema(BOOKING_FIELD_MESSAGES.lastName),
      notes: z
        .string()
        .trim()
        .max(MAX_NOTES_LENGTH, BOOKING_FIELD_MESSAGES.notes),
      phoneCountry: z.string(),
      phoneCountryChosen: z.boolean(),
      phoneNumber: z.string(),
      primaryGoal: z
        .string()
        .refine(
          isOneOf(VISITOR_PRIMARY_GOAL_OPTIONS),
          BOOKING_FIELD_MESSAGES.primaryGoal,
        ),
    })
    .superRefine((details, context) => {
      const birthDate = birthDateProblem(details.dateOfBirth, moment);
      const phone = phoneProblem(details);

      if (birthDate) {
        context.addIssue({
          code: "custom",
          message: birthDate,
          path: ["dateOfBirth"],
        });
      }

      if (phone) {
        context.addIssue({
          code: "custom",
          message: phone,
          path: ["phoneNumber"],
        });
      }
    }) satisfies z.ZodType<BookingDetails>;
}

type BookingDetailsFormProps = {
  enteredDetails: BookingDetails;
  error: BookingClientError | null;
  headingRef: Ref<HTMLHeadingElement>;
  onBack: (details: BookingDetails) => void;
  onSubmit: (details: BookingDetails) => void;
  submission: BookAssessmentCallSubmission;
  timeZone: string;
};

export function BookingDetailsForm(props: BookingDetailsFormProps) {
  const {
    enteredDetails,
    error,
    headingRef,
    onBack,
    onSubmit,
    submission,
    timeZone,
  } = props;
  const [now] = useState(() => new Date());
  const fields = useId();
  const fieldId = (name: string) => `${fields}-${name}`;
  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    setValue,
  } = useForm<BookingDetails>({
    defaultValues: enteredDetails,
    resolver: zodResolver(createBookingDetailsSchema({ now, timeZone })),
  });
  const phoneCountry = useWatch({ control, name: "phoneCountry" });
  const phoneCountryChosen = useWatch({ control, name: "phoneCountryChosen" });
  const submitDetails: SubmitHandler<BookingDetails> = (details) => {
    onSubmit(details);
  };

  const chooseCountry = (country: string) => {
    setValue("country", country, { shouldValidate: Boolean(errors.country) });
    if (!phoneCountryChosen) {
      setValue("phoneCountry", country);
    }
  };

  const choosePhoneCountry = (country: string) => {
    setValue("phoneCountryChosen", true);
    setValue("phoneCountry", country);
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
        data-parity-root="BookingDetailsForm"
        noValidate
        onSubmit={handleSubmit(submitDetails)}
      >
        <div className="absolute size-0 overflow-hidden">
          <BotDetectionWidget {...submission.botDetectionWidgetProps} />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <BookingField
            error={errors.firstName?.message}
            htmlFor={fieldId("first-name")}
            icon={User}
            label="First name"
          >
            <Input
              aria-describedby={describedBy(
                fieldId("first-name"),
                errors.firstName,
              )}
              aria-invalid={errors.firstName ? true : undefined}
              autoComplete="given-name"
              className="pl-9"
              id={fieldId("first-name")}
              placeholder="Jane"
              type="text"
              {...register("firstName")}
            />
          </BookingField>

          <BookingField
            error={errors.lastName?.message}
            htmlFor={fieldId("last-name")}
            label="Last name"
          >
            <Input
              aria-describedby={describedBy(
                fieldId("last-name"),
                errors.lastName,
              )}
              aria-invalid={errors.lastName ? true : undefined}
              autoComplete="family-name"
              id={fieldId("last-name")}
              placeholder="Doe"
              type="text"
              {...register("lastName")}
            />
          </BookingField>
        </div>

        <BookingField
          error={errors.email?.message}
          htmlFor={fieldId("email")}
          icon={Mail}
          label="Email Address"
        >
          <Input
            aria-describedby={describedBy(fieldId("email"), errors.email)}
            aria-invalid={errors.email ? true : undefined}
            autoComplete="email"
            className="pl-9"
            id={fieldId("email")}
            inputMode="email"
            placeholder="jane@example.com"
            type="text"
            {...register("email")}
          />
        </BookingField>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            control={control}
            name="dateOfBirth"
            render={({ field }) => (
              <DateOfBirthField
                error={errors.dateOfBirth?.message}
                id={fieldId("date-of-birth")}
                label="Date of birth"
                now={now}
                onChange={field.onChange}
                timeZone={timeZone}
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <ChoiceSelectField
                error={errors.gender?.message}
                id={fieldId("gender")}
                label="Gender"
                onValueChange={field.onChange}
                options={VISITOR_GENDER_OPTIONS}
                placeholder="Select"
                value={field.value}
              />
            )}
          />
        </div>

        <Controller
          control={control}
          name="primaryGoal"
          render={({ field }) => (
            <ChoiceSelectField
              error={errors.primaryGoal?.message}
              id={fieldId("primary-goal")}
              label="Primary goal"
              onValueChange={field.onChange}
              options={VISITOR_PRIMARY_GOAL_OPTIONS}
              placeholder="Select your goal"
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="country"
          render={({ field }) => (
            <ChoiceSelectField
              autoComplete="country-name"
              error={errors.country?.message}
              id={fieldId("country")}
              label="Country"
              onValueChange={chooseCountry}
              options={COUNTRY_OPTIONS}
              placeholder="Select your country"
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="phoneNumber"
          render={({ field }) => (
            <PhoneField
              country={phoneCountry}
              error={errors.phoneNumber?.message}
              id={fieldId("phone")}
              number={field.value}
              onCountryChange={choosePhoneCountry}
              onNumberChange={field.onChange}
            />
          )}
        />

        <BookingField
          error={errors.notes?.message}
          htmlFor={fieldId("notes")}
          label="Anything to share beforehand? (Optional)"
        >
          <Textarea
            aria-describedby={describedBy(fieldId("notes"), errors.notes)}
            aria-invalid={errors.notes ? true : undefined}
            className="h-24"
            id={fieldId("notes")}
            placeholder="e.g. recovering from a knee injury"
            {...register("notes")}
          />
        </BookingField>

        <div className="pt-4">
          <Button
            aria-busy={submission.isSubmitting || undefined}
            disabled={submission.isSubmitting}
            weight="semibold"
            width="full"
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
                <span className="sr-only">Scheduling your call</span>
              </>
            ) : (
              "Schedule Call"
            )}
          </Button>
        </div>
      </form>
    </>
  );
}

function describedBy(
  fieldId: string,
  error: { message?: string } | undefined,
): string | undefined {
  return error ? `${fieldId}-error` : undefined;
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
      <FieldError id={`${htmlFor}-error`} message={error} />
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
