import { useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { toast } from 'sonner';
import { useCheckins, type CheckinSeries } from '../../context/CheckinContext';
import {
  checkinSchedulingFor,
  coachingEndsAt,
  type CheckIn,
  type CheckinScheduling,
} from '../../domain/checkins';
import { WEEKDAY_NAMES, weekdayNamed } from '../../domain/checkinSeries';
import type { ClientJourney, JourneyGender } from '../../domain/journey';
import { CHECK_IN_DAY_KEY, collaborationPreference } from '../../domain/onboardingAnswers';
import { useCoachCheckinMenu } from '../../hooks/useCoachCheckinMenu';
import { formatClockHour } from '../../utils/dateFormatters';
import { clientPronouns } from '../../utils/journeyLabels';
import { CheckinCard } from '../CheckinCard';
import { DisabledActionHint } from '../DisabledActionHint';
import { PortalWidget } from '../PortalWidget';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
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
  const { seriesFor, seriesWeeks, statusOf, stopSeries } = useCheckins();
  const { rescheduleOf, cancelOf, dialogs } = useCoachCheckinMenu();
  const [dialog, setDialog] = useState<DialogState>({ mode: 'set-up', open: false, openings: 0 });
  const [stop, setStop] = useState<StopState>('closed');

  const client = weeklyClientOf(journey);
  const scheduling = checkinSchedulingFor(journey, new Date());
  const coachingEnds = coachingEndsAt(journey.subscription) !== undefined;
  const series = coachingEnds ? null : seriesFor(client.id);
  const weeks = series ? seriesWeeks(client.id) : [];
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

  const setUpButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-parity="series-set-up"
      onClick={() => openDialog('set-up')}
    >
      Set up
    </Button>
  );

  const actions = () => {
    if (series) {
      return (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-parity="series-change"
            onClick={() => openDialog('change')}
          >
            Change
          </Button>
          <Button
            type="button"
            variant="destructive-outline"
            size="sm"
            data-parity="series-stop"
            onClick={() => setStop('confirming')}
          >
            Stop
          </Button>
        </>
      );
    }
    if (coachingEnds) return null;
    if (scheduling === 'awaiting_onboarding') {
      return (
        <DisabledActionHint reason={awaitingOnboardingReason(journey.identity.gender)}>
          {setUpButton}
        </DisabledActionHint>
      );
    }

    return setUpButton;
  };

  const shownActions = actions();

  const summary = () => {
    if (coachingEnds) {
      return (
        <p className="text-sm text-text-secondary" data-parity="series-coaching-ends">
          {coachingEndsLine(journey.identity.gender, scheduling)}
        </p>
      );
    }
    if (series) {
      return (
        <p className="text-sm font-semibold text-text-primary" data-parity="series-rule">
          {ruleLine(series)}
        </p>
      );
    }

    return (
      <p className="text-sm text-text-secondary" data-parity="series-empty">
        No weekly check-in yet.
      </p>
    );
  };

  const weekCard = (week: CheckIn) => (
    <CheckinCard
      checkin={week}
      status={statusOf(week)}
      viewer={{ party: 'coach', counterpartName: client.firstName }}
      attendee={{ name: client.name }}
      actions={{ menu: { reschedule: rescheduleOf(week), cancel: cancelOf(week) } }}
      actionSize="xs"
    />
  );

  return (
    <PortalWidget
      presentation="coach"
      title="Weekly check-in"
      icon={<CalendarRange aria-hidden="true" className="text-brand-secondary" size={18} />}
      headingId="weekly-check-in-panel-heading"
      parityRoot="WeeklyCheckinPanel"
      className="mb-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3" data-parity="series-summary">
        {summary()}
        {shownActions && (
          <div className="flex flex-wrap gap-2" data-parity="series-actions">
            {shownActions}
          </div>
        )}
      </div>

      {series &&
        (weeks.length > 0 ? (
          <ul aria-label="Weeks to come" className="mt-5 space-y-3" data-parity="series-weeks">
            {weeks.map((week) => (
              <li key={week.id}>{weekCard(week)}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-text-secondary" data-parity="series-weeks-empty">
            No weeks to come.
          </p>
        ))}

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

      {dialogs}
    </PortalWidget>
  );
}
