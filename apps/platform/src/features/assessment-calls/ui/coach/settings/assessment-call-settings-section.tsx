import { zodResolver } from "@hookform/resolvers/zod";
import {
  SettingsRow,
  SettingsRows,
  SettingsSection,
} from "@eli-coach-platform/ui/portal";
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
import { toast } from "@eli-coach-platform/ui/toast";
import { CalendarClock, TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
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
const FORM_ID = "assessment-call-settings-form";
const START_HOUR_FIELD_ID = "start-hour";
const END_HOUR_FIELD_ID = "end-hour";
const MEETING_LINK_FIELD_ID = "meeting-link";

const REFUSED_FIELD_SELECTOR_BY_ERROR_CODE: Partial<
  Record<AssessmentCallSettingsErrorCode, string>
> = {
  no_weekday: 'input[name="weekdays"]',
  invalid_hours: `#${START_HOUR_FIELD_ID}`,
  invalid_meeting_link: 'input[name="meetingLink"]',
};

type AssessmentCallSettingsSectionProps = {
  settings: AssessmentCallSettings;
};

export function AssessmentCallSettingsSection(
  props: AssessmentCallSettingsSectionProps,
) {
  const { settings } = props;
  const headingId = useId();
  const { isSubmitting, response, submit } =
    useSaveAssessmentCallSettingsFetcher();
  const formRef = useRef<HTMLFormElement>(null);
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
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
      reset(response.settings);
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
    const refusedFieldSelector =
      REFUSED_FIELD_SELECTOR_BY_ERROR_CODE[response.error.code];
    if (refusedFieldSelector) {
      formRef.current
        ?.querySelector<HTMLElement>(refusedFieldSelector)
        ?.focus();
    }
  }, [reset, response, setError]);

  const submitSettings: SubmitHandler<AssessmentCallSettings> = (values) => {
    submit({ ...values, timeZone: readBrowserTimeZone() });
  };

  return (
    <div data-parity-root="AssessmentCallSettingsSection">
      <SettingsSection
        description="Visitors book inside the days and hours you set here."
        footer={
          <Button
            aria-busy={isSubmitting || undefined}
            disabled={!isDirty || isSubmitting}
            form={FORM_ID}
            size="md"
            type="submit"
            variant="primary"
          >
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        }
        headingId={headingId}
        icon={
          <CalendarClock
            aria-hidden="true"
            className="text-brand-secondary"
            size={18}
          />
        }
        title="Assessment calls"
      >
        <form
          id={FORM_ID}
          noValidate
          onSubmit={handleSubmit(submitSettings)}
          ref={formRef}
        >
          {timeZoneUnreadable ? (
            <div className="px-5 pt-5 sm:px-6">
              <Alert>
                <p>{ASSESSMENT_CALL_SETTINGS_MESSAGES.invalid_time_zone}</p>
              </Alert>
            </div>
          ) : null}

          <SettingsRows>
            <WeekdaysRow
              error={errors.weekdays?.message}
              register={register}
              selected={weekdays}
            />
            <HoursRow
              control={control}
              error={errors.endHour?.message ?? errors.startHour?.message}
            />
            <MeetingLinkRow
              error={errors.meetingLink?.message}
              register={register}
              value={meetingLink}
            />
          </SettingsRows>
        </form>
      </SettingsSection>
    </div>
  );
}

type SettingsFieldRegister = UseFormRegister<AssessmentCallSettings>;

type WeekdaysRowProps = {
  error: string | undefined;
  register: SettingsFieldRegister;
  selected: readonly Weekday[];
};

function WeekdaysRow({ error, register, selected }: WeekdaysRowProps) {
  const labelId = useId();
  const errorId = useId();

  return (
    <SettingsRow
      aria-describedby={error ? errorId : undefined}
      as="fieldset"
      description="Visitors can pick a slot on these days."
      labelId={labelId}
      layout="stacked"
      title="Days I take calls"
    >
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_DISPLAY_ORDER.map((weekday) => (
          <CheckboxChip
            aria-label={WEEKDAY_LABELS[weekday].full}
            isChecked={selected.includes(weekday)}
            key={weekday}
            value={weekday}
            {...register("weekdays")}
          >
            {WEEKDAY_LABELS[weekday].short}
          </CheckboxChip>
        ))}
      </div>
      <FieldErrorText className="mt-2" id={errorId} message={error} />
    </SettingsRow>
  );
}

type HoursRowProps = {
  control: Control<AssessmentCallSettings>;
  error: string | undefined;
};

function HoursRow({ control, error }: HoursRowProps) {
  const labelId = useId();
  const errorId = useId();

  return (
    <SettingsRow
      description="Slots run inside this window in your time zone."
      labelId={labelId}
      layout="stacked"
      title="Hours"
    >
      <div
        aria-labelledby={labelId}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        role="group"
      >
        <HourSelectField
          control={control}
          errorId={error ? errorId : null}
          id={START_HOUR_FIELD_ID}
          label="Start"
          name="startHour"
          options={HOUR_OPTIONS.start}
        />
        <HourSelectField
          control={control}
          errorId={error ? errorId : null}
          id={END_HOUR_FIELD_ID}
          label="End"
          name="endHour"
          options={HOUR_OPTIONS.end}
        />
      </div>
      <FieldErrorText className="mt-2" id={errorId} message={error} />
    </SettingsRow>
  );
}

type MeetingLinkRowProps = {
  error: string | undefined;
  register: SettingsFieldRegister;
  value: string | null;
};

function MeetingLinkRow({ error, register, value }: MeetingLinkRowProps) {
  const hintId = useId();
  const errorId = useId();

  return (
    <SettingsRow
      description="The room every join link opens."
      descriptionId={hintId}
      htmlFor={MEETING_LINK_FIELD_ID}
      layout="stacked"
      title="Meeting link"
    >
      <Input
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        aria-invalid={error ? true : undefined}
        id={MEETING_LINK_FIELD_ID}
        inputMode="url"
        placeholder="https://meet.google.com/…"
        type="url"
        {...register("meetingLink", {
          setValueAs: toMeetingLinkValue,
        })}
      />
      <FieldErrorText className="mt-2" id={errorId} message={error} />
      {value ? null : (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-status-pending">
          <TriangleAlert aria-hidden="true" size={14} />
          Visitors cannot join calls until a link is set.
        </p>
      )}
    </SettingsRow>
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
  const labelId = `${id}-label`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} id={labelId}>
        {label}
      </Label>
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
              aria-labelledby={labelId}
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

function toMeetingLinkValue(value: string | null): string | null {
  return value ? value : null;
}

function readBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
