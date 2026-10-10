import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { DEMO_CLIENT } from '../../context/CheckinContext';
import { DEMO_JOURNEY_CALL_ID } from '../../context/ClientJourneyContext';
import { checkinSchedulingFor, type CheckIn } from '../../domain/checkins';
import type { ClientJourney, JourneyGender } from '../../domain/journey';
import { formatCheckinDate } from '../../utils/dateFormatters';
import { clientPronouns } from '../../utils/journeyLabels';
import { CheckinScheduleDialog, type ScheduledClient } from '../CheckinScheduleDialog';
import { DisabledActionHint } from '../DisabledActionHint';
import { Button } from '../ui/button';

function awaitingOnboardingReason(gender: JourneyGender): string {
  const { subject, possessive } = clientPronouns(gender);

  return `${subject.capitalised} can answer a check-in once ${subject.lower} ${subject.hasVerb} sent ${possessive.lower} onboarding.`;
}

function scheduledClientOf(journey: ClientJourney): ScheduledClient {
  const { firstName, lastName } = journey.identity;

  return {
    id: journey.callId === DEMO_JOURNEY_CALL_ID ? DEMO_CLIENT.id : journey.callId,
    name: `${firstName} ${lastName}`.trim(),
    firstName,
  };
}

function announceScheduled(checkin: CheckIn) {
  toast.success(`Check-in scheduled for ${formatCheckinDate(checkin.date)}`);
}

export function ScheduleCheckinAction({ journey }: { journey: ClientJourney }) {
  const [open, setOpen] = useState(false);
  const scheduling = checkinSchedulingFor(journey, new Date());

  if (scheduling === 'ended') return null;

  const button = (
    <Button type="button" variant="primary" size="md" onClick={() => setOpen(true)}>
      <CalendarPlus aria-hidden="true" size={16} />
      Schedule check-in
    </Button>
  );

  if (scheduling === 'awaiting_onboarding') {
    return (
      <DisabledActionHint reason={awaitingOnboardingReason(journey.identity.gender)}>
        {button}
      </DisabledActionHint>
    );
  }

  return (
    <>
      {button}
      <CheckinScheduleDialog
        open={open}
        onOpenChange={setOpen}
        client={scheduledClientOf(journey)}
        onScheduled={announceScheduled}
      />
    </>
  );
}
