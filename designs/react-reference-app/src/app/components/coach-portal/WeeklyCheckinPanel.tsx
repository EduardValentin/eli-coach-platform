import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarClock, CalendarRange, CalendarX, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useCheckins, type CheckinSeries } from '../../context/CheckinContext';
import {
  checkinSchedulingFor,
  checkinStartsAt,
  coachingEndsAt,
  type CheckIn,
  type CheckinScheduling,
} from '../../domain/checkins';
import { WEEKDAY_NAMES, weekdayNamed } from '../../domain/checkinSeries';
import type { ClientJourney, JourneyGender } from '../../domain/journey';
import { CHECK_IN_DAY_KEY, collaborationPreference } from '../../domain/onboardingAnswers';
import { coachCheckinsPath, coachSeriesCheckinPath } from '../../utils/checkinLinks';
import { formatClockHour } from '../../utils/dateFormatters';
import { clientPronouns } from '../../utils/journeyLabels';
import { DateTimeLabel } from '../DateTimeLabel';
import { DisabledActionHint } from '../DisabledActionHint';
import { PortalWidget } from '../PortalWidget';
import { RowActionsMenu } from '../RowActionsMenu';
import { Badge } from '../ui/badge';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { cn } from '../ui/utils';
import { WidgetAction, WidgetLink } from '../WidgetLink';
import { awaitingOnboardingReason, scheduledClientOf } from './checkinClient';
import { DASHBOARD_ROW_CLASS } from './DashboardAppointmentRow';
import {
  WeeklyCheckinDialog,
  type WeeklyCheckinClient,
  type WeeklyCheckinMode,
} from './WeeklyCheckinDialog';

type DialogState = { mode: WeeklyCheckinMode; open: boolean; openings: number };

type StopState = 'closed' | 'confirming' | 'stopping';

function ruleLine({ weekday, hour }: CheckinSeries): string {
  return `Every ${WEEKDAY_NAMES[weekday]} at ${formatClockHour(hour)}`;
}

function coachingEndsLine(gender: JourneyGender, scheduling: CheckinScheduling): string {
  const { possessive } = clientPronouns(gender);
  const coaching = scheduling === 'ended' ? 'has ended' : 'is ending';

  return `${possessive.capitalised} coaching ${coaching}, so no weekly check-in can be set up.`;
}

function weeklyClientOf(journey: ClientJourney): WeeklyCheckinClient {
  return { ...scheduledClientOf(journey), gender: journey.identity.gender };
}

function NextWeekLink({
  week,
  clientName,
  clashes,
}: {
  week: CheckIn;
  clientName: string;
  clashes: boolean;
}) {
  return (
    <Link
      to={coachSeriesCheckinPath(week.id, clientName)}
      className={cn(DASHBOARD_ROW_CLASS, 'group mt-3')}
      data-parity="series-next-week"
    >
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="sr-only">Next weekly check-in: </span>
        <DateTimeLabel startsAt={checkinStartsAt(week)} size="sm" />
        {clashes && (
          <Badge tone="pending" data-parity="clash-badge">
            Clash
          </Badge>
        )}
      </span>
      <ChevronRight
        aria-hidden="true"
        size={16}
        className="shrink-0 text-text-secondary transition-colors group-hover:text-text-primary"
        data-parity="series-next-week-chevron"
      />
    </Link>
  );
}

export function WeeklyCheckinPanel({ journey }: { journey: ClientJourney }) {
  const { seriesFor, seriesWeeks, statusOf, stopSeries } = useCheckins();
  const [dialog, setDialog] = useState<DialogState>({ mode: 'set-up', open: false, openings: 0 });
  const [stop, setStop] = useState<StopState>('closed');

  const client = weeklyClientOf(journey);
  const scheduling = checkinSchedulingFor(journey, new Date());
  const coachingEnds = coachingEndsAt(journey.subscription) !== undefined;
  const series = coachingEnds ? null : seriesFor(client.id);
  const [nextWeek] = series ? seriesWeeks(client.id) : [];
  const suggestedWeekday = weekdayNamed(
    collaborationPreference(journey.onboarding, CHECK_IN_DAY_KEY),
  );

  const openDialog = (mode: WeeklyCheckinMode) =>
    setDialog((current) => ({ mode, open: true, openings: current.openings + 1 }));

  const confirmStop = async () => {
    setStop('stopping');
    try {
      const { status } = await stopSeries(client.id);
      if (status === 'stopped') toast.success('Weekly check-in stopped');
      else toast.error('The weekly check-in changed meanwhile.');
    } catch {
      toast.error("The weekly check-in wasn't stopped. Try again.");
    } finally {
      setStop('closed');
    }
  };

  const setUpAction = (
    <WidgetAction trailing="arrow" data-parity="series-set-up" onClick={() => openDialog('set-up')}>
      Set up a weekly check-in
    </WidgetAction>
  );

  const footer = () => {
    if (coachingEnds) return null;
    if (series) {
      return (
        <WidgetLink trailing="arrow" to={coachCheckinsPath()} data-parity="series-view-all">
          View all check-ins
        </WidgetLink>
      );
    }
    if (scheduling === 'awaiting_onboarding') {
      return (
        <DisabledActionHint reason={awaitingOnboardingReason(journey.identity.gender)}>
          {setUpAction}
        </DisabledActionHint>
      );
    }

    return setUpAction;
  };

  const body = () => {
    if (coachingEnds) {
      return (
        <p className="text-sm text-text-secondary" data-parity="series-coaching-ends">
          {coachingEndsLine(journey.identity.gender, scheduling)}
        </p>
      );
    }
    if (!series) {
      return (
        <p className="text-sm text-text-secondary" data-parity="series-empty">
          No weekly check-in yet.
        </p>
      );
    }
    if (!nextWeek) {
      return (
        <p className="mt-1 text-sm text-text-secondary" data-parity="series-weeks-empty">
          No week to come.
        </p>
      );
    }

    return (
      <NextWeekLink
        week={nextWeek}
        clientName={client.name}
        clashes={statusOf(nextWeek) === 'clash'}
      />
    );
  };

  return (
    <PortalWidget
      presentation="coach"
      density="compact"
      title="Weekly check-in"
      icon={<CalendarRange aria-hidden="true" className="text-brand-secondary" size={16} />}
      headingId="weekly-check-in-panel-heading"
      parityRoot="WeeklyCheckinPanel"
      className="h-full"
      hero={series && <span data-parity="series-rule">{ruleLine(series)}</span>}
      action={
        series && (
          <RowActionsMenu
            label="More actions for the weekly check-in"
            size="xs"
            actions={[
              {
                name: 'change',
                label: 'Change',
                icon: CalendarClock,
                onSelect: () => openDialog('change'),
              },
              {
                name: 'stop',
                label: 'Stop',
                icon: CalendarX,
                tone: 'destructive',
                onSelect: () => setStop('confirming'),
              },
            ]}
          />
        )
      }
      footer={footer()}
    >
      <div data-parity="series-summary">{body()}</div>

      <WeeklyCheckinDialog
        key={dialog.openings}
        client={client}
        mode={dialog.mode}
        series={series}
        suggestedWeekday={suggestedWeekday}
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
      />

      <ConfirmDialog
        open={stop !== 'closed'}
        onOpenChange={(open) => {
          if (!open && stop !== 'stopping') setStop('closed');
        }}
        title="Stop the weekly check-in?"
        description={`Every week still to come is cancelled and ${client.firstName} is told.`}
        cancelLabel="Keep"
        confirmLabel="Stop"
        confirmDisabled={stop === 'stopping'}
        onConfirm={() => void confirmStop()}
        tone="destructive"
      />
    </PortalWidget>
  );
}
