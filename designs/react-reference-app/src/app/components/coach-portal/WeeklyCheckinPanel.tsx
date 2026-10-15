import { useState } from 'react';
import { CalendarClock, CalendarRange, CalendarX } from 'lucide-react';
import { toast } from 'sonner';
import { useCheckins, type CheckinSeries } from '../../context/CheckinContext';
import {
  checkinSchedulingFor,
  coachingEndsAt,
  type CheckinScheduling,
} from '../../domain/checkins';
import { WEEKDAY_NAMES, weekdayNamed } from '../../domain/checkinSeries';
import type { ClientJourney, JourneyGender } from '../../domain/journey';
import { CHECK_IN_DAY_KEY, collaborationPreference } from '../../domain/onboardingAnswers';
import { coachCheckinsPath } from '../../utils/checkinLinks';
import { formatClockHour } from '../../utils/dateFormatters';
import { clientPronouns } from '../../utils/journeyLabels';
import { DisabledActionHint } from '../DisabledActionHint';
import { PortalWidget } from '../PortalWidget';
import { RowActionsMenu } from '../RowActionsMenu';
import { VALUE_CLASS } from '../typography';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { WidgetAction, WidgetLink } from '../WidgetLink';
import { awaitingOnboardingReason, scheduledClientOf } from './checkinClient';
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

export function WeeklyCheckinPanel({ journey }: { journey: ClientJourney }) {
  const { seriesFor, stopSeries } = useCheckins();
  const [dialog, setDialog] = useState<DialogState>({ mode: 'set-up', open: false, openings: 0 });
  const [stop, setStop] = useState<StopState>('closed');

  const client = weeklyClientOf(journey);
  const scheduling = checkinSchedulingFor(journey, new Date());
  const coachingEnds = coachingEndsAt(journey.subscription) !== undefined;
  const series = coachingEnds ? null : seriesFor(client.id);
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

    return (
      <p className={VALUE_CLASS} data-parity="series-rule">
        {ruleLine(series)}
      </p>
    );
  };

  return (
    <PortalWidget
      presentation="coach"
      title="Weekly check-in"
      icon={CalendarRange}
      headingId="weekly-check-in-panel-heading"
      parityRoot="WeeklyCheckinPanel"
      className="h-full"
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
