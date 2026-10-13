import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { checkinSchedulingFor, type CheckIn } from '../../domain/checkins';
import type { ClientJourney } from '../../domain/journey';
import { formatCheckinDate } from '../../utils/dateFormatters';
import { CheckinScheduleDialog } from '../CheckinScheduleDialog';
import { DisabledActionHint } from '../DisabledActionHint';
import { Button } from '../ui/button';
import { awaitingOnboardingReason, scheduledClientOf } from './checkinClient';

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
