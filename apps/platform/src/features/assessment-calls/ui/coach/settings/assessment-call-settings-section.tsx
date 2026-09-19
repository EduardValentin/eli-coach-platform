import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  CheckboxChip,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@eli-coach-platform/ui/primitives";
import { cn } from "@eli-coach-platform/ui/lib";
import { toast } from "@eli-coach-platform/ui/overlays";
import { useEffect, useId, useState } from "react";
import {
  Controller,
  useForm,
  type Control,
  type SubmitHandler,
  type UseFormRegister,
} from "react-hook-form";

import {
  ASSESSMENT_CALL_SETTINGS_MESSAGES,
  ASSESSMENT_CALL_SETTINGS_TOASTS,
  assessmentCallSettingsSchema,
  HOUR_OPTIONS,
  WEEKDAY_DISPLAY_ORDER,
  type AssessmentCallSettings,
  type AssessmentCallSettingsErrorCode,
} from "~/features/assessment-calls/contracts/assessment-call-settings";

import { useSaveAssessmentCallSettingsFetcher } from "./api-client";

type Weekday = AssessmentCallSettings["weekdays"][number];
type HourField = "endHour" | "startHour";

const WEEKDAY_LABELS: Record<Weekday, { full: string; short: string }> = {
  monday: { full: "Monday", short: "Mon" },
  tuesday: { full: "Tuesday", short: "Tue" },
  wednesday: { full: "Wednesday", short: "Wed" },
  thursday: { full: "Thursday", short: "Thu" },
  friday: { full: "Friday", short: "Fri" },
  saturday: { full: "Saturday", short: "Sat" },
  sunday: { full: "Sunday", short: "Sun" },
};

const FIELD_BY_ERROR_CODE: Partial<
  Record<
    AssessmentCallSettingsErrorCode,
    HourField | "meetingLink" | "weekdays"
  >
> = {
  invalid_hours: "endHour",
  invalid_meeting_link: "meetingLink",
  no_weekday: "weekdays",
};

const FIELD_ERROR_CLASS = "text-sm font-medium text-feedback-danger";

type AssessmentCallSettingsSectionProps = {
  settings: AssessmentCallSettings;
};

export function AssessmentCallSettingsSection(
  props: AssessmentCallSettingsSectionProps,
) {
  const { settings } = props;
  const headingId = useId();
  const hoursErrorId = useId();
  const { isSubmitting, response, submit } =
    useSaveAssessmentCallSettingsFetcher();
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    setError,
    watch,
  } = useForm<AssessmentCallSettings>({
    defaultValues: settings,
    resolver: zodResolver(assessmentCallSettingsSchema),
  });
  const weekdays = watch("weekdays");
  const meetingLink = watch("meetingLink");
  const [timeZoneUnreadable, setTimeZoneUnreadable] = useState(false);

  useEffect(() => {
    if (!response) {
      return;
    }

    const errorCode = response.success ? null : response.error.code;

    setTimeZoneUnreadable(errorCode === "invalid_time_zone");

    if (response.success) {
      toast.success(ASSESSMENT_CALL_SETTINGS_TOASTS.saved);
      return;
    }

    if (errorCode === "invalid_time_zone") {
      return;
    }

    if (errorCode === "server_error") {
      toast.error(ASSESSMENT_CALL_SETTINGS_TOASTS.failed);
      return;
    }

    const field = FIELD_BY_ERROR_CODE[response.error.code];

    if (!field) {
      toast.error(response.error.message);
      return;
    }

    setError(field, { message: response.error.message });
  }, [response, setError]);

  const submitSettings: SubmitHandler<AssessmentCallSettings> = (values) => {
    submit({ ...values, timeZone: readBrowserTimeZone() });
  };

  const hoursError = errors.endHour?.message ?? errors.startHour?.message;

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-panel border bg-surface-base"
      data-parity-root="AssessmentCallSettingsSection"
    >
      <div className="border-b px-5 py-4 sm:px-6">
        <h2
          className="font-heading text-lg font-semibold text-text-primary"
          id={headingId}
        >
          Assessment calls
        </h2>
      </div>

      <form
        className="space-y-6 px-5 py-5 sm:px-6"
        noValidate
        onSubmit={handleSubmit(submitSettings)}
      >
        {timeZoneUnreadable ? (
          <Alert>
            <p>{ASSESSMENT_CALL_SETTINGS_MESSAGES.invalid_time_zone}</p>
          </Alert>
        ) : null}

        <WeekdayChoiceField
          error={errors.weekdays}
          register={register}
          weekdays={weekdays}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <HourSelectField
            control={control}
            errorId={hoursError ? hoursErrorId : null}
            id="start-hour"
            label="Start"
            name="startHour"
            options={HOUR_OPTIONS.start}
          />
          <HourSelectField
            control={control}
            errorId={hoursError ? hoursErrorId : null}
            id="end-hour"
            label="End"
            name="endHour"
            options={HOUR_OPTIONS.end}
          />
        </div>
        <FieldErrorText id={hoursErrorId} message={hoursError} />

        <MeetingLinkField error={errors.meetingLink} register={register} />

        {meetingLink ? null : (
          <Alert>
            <p>Visitors cannot join calls until a link is set.</p>
          </Alert>
        )}

        <div className="-mx-5 flex justify-end border-t px-5 pt-4 sm:-mx-6 sm:px-6">
          <Button
            aria-busy={isSubmitting || undefined}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function WeekdayChoiceField(props: {
  error: { message?: string } | undefined;
  register: UseFormRegister<AssessmentCallSettings>;
  weekdays: readonly Weekday[];
}) {
  const { error, register, weekdays } = props;
  const errorId = useId();

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-medium text-text-primary">
        Days I take calls
      </legend>
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_DISPLAY_ORDER.map((weekday) => (
          <CheckboxChip
            aria-label={WEEKDAY_LABELS[weekday].full}
            isChecked={weekdays.includes(weekday)}
            key={weekday}
            value={weekday}
            {...register("weekdays")}
          >
            {WEEKDAY_LABELS[weekday].short}
          </CheckboxChip>
        ))}
      </div>
      <FieldErrorText className="mt-2" id={errorId} message={error?.message} />
    </fieldset>
  );
}

function MeetingLinkField(props: {
  error: { message?: string } | undefined;
  register: UseFormRegister<AssessmentCallSettings>;
}) {
  const { error, register } = props;
  const linkId = useId();
  const hintId = `${linkId}-hint`;
  const errorId = `${linkId}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={linkId}>Meeting link</Label>
      <Input
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        aria-invalid={error ? true : undefined}
        id={linkId}
        placeholder="https://meet.google.com/…"
        type="url"
        {...register("meetingLink")}
      />
      <p className="text-xs text-text-muted" id={hintId}>
        The room every join link opens.
      </p>
      <FieldErrorText id={errorId} message={error?.message} />
    </div>
  );
}

function HourSelectField(props: {
  control: Control<AssessmentCallSettings>;
  errorId: string | null;
  id: string;
  label: string;
  name: HourField;
  options: ReadonlyArray<{ label: string; value: number }>;
}) {
  const { control, errorId, id, label, name, options } = props;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            onValueChange={(value) => field.onChange(Number(value))}
            value={String(field.value)}
          >
            <SelectTrigger
              aria-describedby={errorId ?? undefined}
              aria-invalid={errorId ? true : undefined}
              id={id}
              onBlur={field.onBlur}
              ref={field.ref}
            >
              <SelectValue>
                {labelForSelectedHour(options, field.value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );
}

function FieldErrorText(props: {
  className?: string;
  id: string;
  message: string | undefined;
}) {
  const { className, id, message } = props;

  if (!message) {
    return null;
  }

  return (
    <p className={cn(FIELD_ERROR_CLASS, className)} id={id} role="alert">
      {message}
    </p>
  );
}

function labelForSelectedHour(
  options: ReadonlyArray<{ label: string; value: number }>,
  value: number,
): string {
  return options.find((option) => option.value === value)?.label ?? "";
}

function readBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
