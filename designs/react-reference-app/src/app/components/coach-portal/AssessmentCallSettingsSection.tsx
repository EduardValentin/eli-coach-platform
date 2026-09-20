import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Alert } from '../ui/alert';
import { Button } from '../ThemeButton';
import { CheckboxChip } from '../CheckboxChip';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../ui/utils';
import { useAssessmentCalls } from '../../context/AssessmentCallContext';
import { FIELD_ERROR_CLASS } from '../../utils/formFieldStyles';
import {
  AssessmentCallError,
  ASSESSMENT_CALL_SETTINGS_PROBLEM_MESSAGES,
  validateAssessmentCallSettings,
  type AssessmentCallSettings,
  type AssessmentCallSettingsProblem,
} from '../../services/assessmentCallService';

type WeekdayOption = { value: number; short: string; full: string };

const WEEKDAY_OPTIONS: WeekdayOption[] = [
  { value: 1, short: 'Mon', full: 'Monday' },
  { value: 2, short: 'Tue', full: 'Tuesday' },
  { value: 3, short: 'Wed', full: 'Wednesday' },
  { value: 4, short: 'Thu', full: 'Thursday' },
  { value: 5, short: 'Fri', full: 'Friday' },
  { value: 6, short: 'Sat', full: 'Saturday' },
  { value: 0, short: 'Sun', full: 'Sunday' },
];

const START_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);
const END_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour + 1);

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function readBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

type AssessmentCallSettingsDraft = {
  weekdays: number[];
  startHour: number;
  endHour: number;
  meetingLink: string;
};

function toDraft(settings: AssessmentCallSettings): AssessmentCallSettingsDraft {
  return {
    weekdays: settings.weekdays,
    startHour: settings.startHour,
    endHour: settings.endHour,
    meetingLink: settings.meetingLink ?? '',
  };
}

function FieldError({
  id,
  message,
  className,
}: {
  id: string;
  message: string;
  className?: string;
}) {
  return (
    <p id={id} role="alert" className={cn(FIELD_ERROR_CLASS, className)}>
      {message}
    </p>
  );
}

function HourSelect({
  id,
  label,
  hour,
  hourOptions,
  errorId,
  onHourChange,
}: {
  id: string;
  label: string;
  hour: number;
  hourOptions: number[];
  errorId?: string;
  onHourChange: (hour: number) => void;
}) {
  const labelId = `${id}-label`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} id={labelId}>
        {label}
      </Label>
      <Select value={String(hour)} onValueChange={(value) => onHourChange(Number(value))}>
        <SelectTrigger
          id={id}
          className="w-full"
          aria-describedby={errorId}
          aria-invalid={Boolean(errorId) || undefined}
          aria-labelledby={labelId}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hourOptions.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {formatHourLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function WeekdayFieldset({
  selectedWeekdays,
  errorId,
  onToggleWeekday,
}: {
  selectedWeekdays: number[];
  errorId?: string;
  onToggleWeekday: (day: number) => void;
}) {
  return (
    <fieldset aria-describedby={errorId}>
      <legend className="text-sm font-medium text-foreground mb-2">Days I take calls</legend>
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_OPTIONS.map(({ value, short, full }) => (
          <CheckboxChip
            key={value}
            checked={selectedWeekdays.includes(value)}
            onCheckedChange={() => onToggleWeekday(value)}
            aria-label={full}
          >
            {short}
          </CheckboxChip>
        ))}
      </div>
      {errorId && (
        <FieldError
          id={errorId}
          message={ASSESSMENT_CALL_SETTINGS_PROBLEM_MESSAGES.no_weekday}
          className="mt-2"
        />
      )}
    </fieldset>
  );
}

export function AssessmentCallSettingsSection() {
  const { settings, saveSettings } = useAssessmentCalls();
  const [draft, setDraft] = useState<AssessmentCallSettingsDraft>(() => toDraft(settings));
  const [problems, setProblems] = useState<AssessmentCallSettingsProblem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const toggleWeekday = (day: number) => {
    setDraft((previous) => ({
      ...previous,
      weekdays: previous.weekdays.includes(day)
        ? previous.weekdays.filter((existing) => existing !== day)
        : [...previous.weekdays, day].sort((a, b) => a - b),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const candidate: AssessmentCallSettings = {
      timeZone: readBrowserTimeZone(),
      weekdays: draft.weekdays,
      startHour: draft.startHour,
      endHour: draft.endHour,
      meetingLink: draft.meetingLink.trim() === '' ? null : draft.meetingLink.trim(),
    };

    const foundProblems = validateAssessmentCallSettings(candidate);
    setProblems(foundProblems);

    if (foundProblems.length > 0) return;

    setIsSaving(true);
    try {
      await saveSettings(candidate);
      toast.success('Settings saved');
    } catch (error) {
      if (!(error instanceof AssessmentCallError)) throw error;
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const showLinkWarning = draft.meetingLink.trim() === '';
  const weekdaysErrorId = problems.includes('no_weekday')
    ? 'assessment-call-weekdays-error'
    : undefined;
  const hoursErrorId = problems.includes('invalid_hours')
    ? 'assessment-call-hours-error'
    : undefined;
  const linkErrorId = problems.includes('invalid_meeting_link')
    ? 'assessment-call-meeting-link-error'
    : undefined;
  const linkHintId = 'assessment-call-meeting-link-hint';
  const timeZoneUnreadable = problems.includes('invalid_time_zone');

  return (
    <section
      aria-labelledby="assessment-call-heading"
      className="bg-card rounded-panel border border-border overflow-hidden"
    >
      <div className="px-5 sm:px-6 py-4 border-b border-border">
        <h2
          id="assessment-call-heading"
          className="font-serif text-lg font-semibold text-foreground"
        >
          Assessment calls
        </h2>
      </div>

      <form noValidate onSubmit={handleSubmit} className="px-5 sm:px-6 py-5 space-y-6">
        {timeZoneUnreadable && (
          <Alert>
            <p>{ASSESSMENT_CALL_SETTINGS_PROBLEM_MESSAGES.invalid_time_zone}</p>
          </Alert>
        )}

        <WeekdayFieldset
          selectedWeekdays={draft.weekdays}
          errorId={weekdaysErrorId}
          onToggleWeekday={toggleWeekday}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <HourSelect
            id="assessment-call-start-hour"
            label="Start"
            hour={draft.startHour}
            hourOptions={START_HOUR_OPTIONS}
            errorId={hoursErrorId}
            onHourChange={(hour) => setDraft((previous) => ({ ...previous, startHour: hour }))}
          />
          <HourSelect
            id="assessment-call-end-hour"
            label="End"
            hour={draft.endHour}
            hourOptions={END_HOUR_OPTIONS}
            errorId={hoursErrorId}
            onHourChange={(hour) => setDraft((previous) => ({ ...previous, endHour: hour }))}
          />
        </div>
        {hoursErrorId && (
          <FieldError
            id={hoursErrorId}
            message={ASSESSMENT_CALL_SETTINGS_PROBLEM_MESSAGES.invalid_hours}
          />
        )}

        <div className="space-y-2">
          <Label htmlFor="assessment-call-meeting-link">Meeting link</Label>
          <Input
            id="assessment-call-meeting-link"
            type="url"
            inputMode="url"
            placeholder="https://meet.google.com/…"
            value={draft.meetingLink}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, meetingLink: event.target.value }))
            }
            aria-describedby={[linkHintId, linkErrorId].filter(Boolean).join(' ')}
            aria-invalid={Boolean(linkErrorId) || undefined}
          />
          <p id={linkHintId} className="text-xs text-muted-foreground">
            The room every join link opens.
          </p>
          {linkErrorId && (
            <FieldError
              id={linkErrorId}
              message={ASSESSMENT_CALL_SETTINGS_PROBLEM_MESSAGES.invalid_meeting_link}
            />
          )}
        </div>

        {showLinkWarning && (
          <Alert>
            <p>Visitors cannot join calls until a link is set.</p>
          </Alert>
        )}

        <div className="flex justify-end pt-4 -mx-5 sm:-mx-6 px-5 sm:px-6 border-t border-border">
          <Button type="submit" disabled={isSaving} aria-busy={isSaving || undefined}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </section>
  );
}
