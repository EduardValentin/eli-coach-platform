import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  useCheckins,
  type CheckinSeries,
  type SeriesChangeResult,
  type SeriesSetUpResult,
} from '../../context/CheckinContext';
import { hourLabel, WEEKDAY_NAMES } from '../../domain/checkinSeries';
import type { JourneyGender } from '../../domain/journey';
import type { SeriesHourPreview } from '../../services/checkinService';
import { clientPronouns } from '../../utils/journeyLabels';
import { StepButton } from '../CheckinSchedulerSheet';
import { ChoiceGroup, ChoiceOption } from '../ChoiceGroup';
import { TimeSlotButton } from '../DateTimePicker';
import type { ScheduledClient } from '../CheckinScheduleDialog';
import { Alert, AlertAction } from '../ui/alert';
import { cn } from '../ui/utils';
import {
  ResponsiveSheetDialog,
  SheetDialogBody,
  SheetDialogFooter,
  SheetDialogHeader,
} from '../workout/ResponsiveSheetDialog';

export type WeeklyCheckinMode = 'set-up' | 'change';

export type WeeklyCheckinClient = ScheduledClient & { gender: JourneyGender };

type SaveRefusal =
  | Exclude<SeriesSetUpResult['status'], 'set_up'>
  | Exclude<SeriesChangeResult['status'], 'changed'>
  | 'failed';

type HoursListing =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; hours: SeriesHourPreview[] };

const WEEKDAY_SHORT_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FIELD_LABEL_CLASS = 'mb-2 block text-sm font-medium text-text-primary';

const MODE_WORDING: Record<WeeklyCheckinMode, { action: string; busy: string; saved: string }> = {
  'set-up': { action: 'Set up', busy: 'Setting up…', saved: 'Weekly check-in set up' },
  change: { action: 'Change', busy: 'Changing…', saved: 'Weekly check-in changed' },
};

function clashesLabel(clashes: number): string | null {
  if (clashes === 0) return null;

  return clashes === 1 ? '1 clash' : `${clashes} clashes`;
}

function refusalCopy(refusal: SaveRefusal, client: WeeklyCheckinClient): string {
  const { possessive } = clientPronouns(client.gender);
  const copy: Record<SaveRefusal, string> = {
    series_exists: 'A weekly check-in already exists.',
    outside_availability: 'Pick a day and hour inside your availability.',
    nothing_to_create: `${possessive.capitalised} paid period has no week left to book.`,
    client_cannot_answer: `${client.firstName} can't have a weekly check-in right now.`,
    changed_meanwhile: 'The weekly check-in changed meanwhile.',
    failed: "The weekly check-in wasn't saved. Try again.",
  };

  return copy[refusal];
}

function titleOf(mode: WeeklyCheckinMode, client: WeeklyCheckinClient): string {
  return mode === 'set-up'
    ? `Set up a weekly check-in with ${client.firstName}`
    : 'Change the weekly check-in';
}

function descriptionOf(
  mode: WeeklyCheckinMode,
  { client, weekday }: { client: WeeklyCheckinClient; weekday: number | null },
): string {
  if (mode === 'set-up') {
    const { possessive } = clientPronouns(client.gender);
    return `Pick the day and hour. Every week until ${possessive.lower} paid period ends is booked.`;
  }

  return `Every week from the next ${WEEKDAY_NAMES[weekday ?? 0]} is moved.`;
}

function fallbackWeekday(offered: number[], series: CheckinSeries | null): number | undefined {
  if (series && offered.includes(series.weekday)) return series.weekday;

  return offered[0];
}

export function WeeklyCheckinDialog({
  client,
  mode,
  series,
  suggestedWeekday,
  open,
  onOpenChange,
}: {
  client: WeeklyCheckinClient;
  mode: WeeklyCheckinMode;
  series: CheckinSeries | null;
  suggestedWeekday: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { previewSeries, setUpSeries, changeSeries } = useCheckins();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const latestLoad = useRef(0);
  const dayLabelId = useId();
  const hourLabelId = useId();
  const [weekday, setWeekday] = useState<number | null>(
    suggestedWeekday ?? series?.weekday ?? null,
  );
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [listing, setListing] = useState<HoursListing>({ status: 'loading' });
  const [hour, setHour] = useState<number | null>(null);
  const [problem, setProblem] = useState<SaveRefusal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const wording = MODE_WORDING[mode];

  const load = useCallback(
    async (day: number | null) => {
      const thisLoad = latestLoad.current + 1;
      latestLoad.current = thisLoad;
      setListing({ status: 'loading' });
      try {
        const preview = await previewSeries(client.id, day);
        if (latestLoad.current !== thisLoad) return;
        setWeekdays(preview.weekdays);
        const fallback = fallbackWeekday(preview.weekdays, series);
        if ((day === null || !preview.weekdays.includes(day)) && fallback !== undefined) {
          setWeekday(fallback);
          return;
        }
        setListing({ status: 'ready', hours: preview.hours });
      } catch {
        if (latestLoad.current === thisLoad) setListing({ status: 'failed' });
      }
    },
    [previewSeries, client.id, series],
  );

  useEffect(() => {
    if (open) void load(weekday);
  }, [open, weekday, load]);

  const chooseWeekday = (value: string) => {
    setWeekday(Number(value));
    setProblem(null);
  };

  const chooseHour = (chosen: number) => {
    setHour(chosen);
    setProblem(null);
  };

  const save = async () => {
    if (weekday === null || hour === null) return;
    setSubmitting(true);
    setProblem(null);
    try {
      const choice = { weekday, hour };
      const result =
        mode === 'set-up' ? await setUpSeries(client, choice) : await changeSeries(client, choice);
      if (result.status === 'set_up' || result.status === 'changed') {
        toast.success(wording.saved);
        onOpenChange(false);
        return;
      }
      setProblem(result.status);
      if (result.status === 'changed_meanwhile') void load(weekday);
    } catch {
      setProblem('failed');
    } finally {
      setSubmitting(false);
    }
  };

  const title = titleOf(mode, client);
  const description = descriptionOf(mode, { client, weekday });

  return (
    <ResponsiveSheetDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      width="fit"
      dismissal={submitting ? 'locked' : 'allowed'}
      initialFocus={titleRef}
    >
      <div data-parity-root="WeeklyCheckinDialog" className="flex min-h-0 flex-1 flex-col">
        <SheetDialogHeader
          title={title}
          description={description}
          rule="faint"
          titleRef={titleRef}
        />
        <SheetDialogBody>
          {problem && (
            <Alert className="mb-6">
              <p>{refusalCopy(problem, client)}</p>
            </Alert>
          )}
          {weekdays.length > 0 && (
            <>
              <p id={dayLabelId} className={FIELD_LABEL_CLASS}>
                Day
              </p>
              <ChoiceGroup
                aria-labelledby={dayLabelId}
                value={weekday === null ? '' : String(weekday)}
                onValueChange={chooseWeekday}
                disabled={submitting}
                data-parity="series-weekday"
              >
                {weekdays.map((day) => (
                  <ChoiceOption key={day} value={String(day)} aria-label={WEEKDAY_NAMES[day]}>
                    {WEEKDAY_SHORT_NAMES[day]}
                  </ChoiceOption>
                ))}
              </ChoiceGroup>
              <p id={hourLabelId} className={cn('mt-6', FIELD_LABEL_CLASS)}>
                Hour
              </p>
            </>
          )}
          <HourChoice
            listing={listing}
            labelledBy={hourLabelId}
            hour={hour}
            onChooseHour={chooseHour}
            onRetry={() => void load(weekday)}
          />
        </SheetDialogBody>
        <SheetDialogFooter rule="faint">
          <StepButton
            label={submitting ? wording.busy : wording.action}
            disabled={listing.status !== 'ready' || hour === null}
            busy={submitting}
            onSubmit={() => void save()}
          />
        </SheetDialogFooter>
      </div>
    </ResponsiveSheetDialog>
  );
}

function HourChoice({
  listing,
  labelledBy,
  hour,
  onChooseHour,
  onRetry,
}: {
  listing: HoursListing;
  labelledBy: string;
  hour: number | null;
  onChooseHour: (hour: number) => void;
  onRetry: () => void;
}) {
  if (listing.status === 'loading') {
    return (
      <p role="status" className="py-8 text-center text-sm text-text-secondary">
        Loading hours…
      </p>
    );
  }

  if (listing.status === 'failed') {
    return (
      <Alert action={<AlertAction onClick={onRetry}>Try again</AlertAction>}>
        <p>We couldn&apos;t load the hours just now.</p>
      </Alert>
    );
  }

  return (
    <ul aria-labelledby={labelledBy} data-parity="series-hours" className="grid gap-2">
      {listing.hours.map((offered) => {
        const clashes = clashesLabel(offered.clashes);
        return (
          <li key={offered.hour}>
            <TimeSlotButton
              label={hourLabel(offered.hour)}
              isSelected={hour === offered.hour}
              detail={clashes ? { text: clashes, parity: 'hour-clashes' } : undefined}
              onSelect={() => onChooseHour(offered.hour)}
            />
          </li>
        );
      })}
    </ul>
  );
}
