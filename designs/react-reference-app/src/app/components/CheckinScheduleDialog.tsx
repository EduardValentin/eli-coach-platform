import {
  useCheckins,
  type CheckinClient,
  type CheckinScheduleResult,
} from '../context/CheckinContext';
import type { CheckIn } from '../domain/checkins';
import { useCheckinPicker, type CheckinChoice } from '../hooks/useCheckinPicker';
import { browserTimeZone } from '../utils/dateFormatters';
import { CheckinSchedulerSheet, TIME_TAKEN_COPY } from './CheckinSchedulerSheet';

type ScheduleRefusal = Exclude<CheckinScheduleResult['status'], 'scheduled'>;

export type ScheduledClient = CheckinClient & { firstName: string };

function problemCopy(problem: ScheduleRefusal | 'failed', firstName: string): string {
  if (problem === 'time_taken') return TIME_TAKEN_COPY;
  if (problem === 'client_cannot_answer') return `${firstName} can't answer a check-in right now.`;

  return "The check-in wasn't scheduled. Try again.";
}

export function CheckinScheduleDialog({
  open,
  onOpenChange,
  client,
  onScheduled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ScheduledClient;
  onScheduled: (checkin: CheckIn) => void;
}) {
  const { scheduleCheckin } = useCheckins();
  const { firstName } = client;

  const send = async ({ startsAt, note }: CheckinChoice): Promise<ScheduleRefusal | null> => {
    const result = await scheduleCheckin({ client, startsAt, note });
    if (result.status !== 'scheduled') return result.status;

    onScheduled(result.checkin);
    return null;
  };

  const { problem, sheet } = useCheckinPicker({ open, onOpenChange, send });

  return (
    <CheckinSchedulerSheet
      {...sheet}
      variant="request"
      title={`Schedule a check-in with ${firstName}`}
      description={`Pick a date and time. ${firstName} will approve or decline it.`}
      wording={{
        noteLabel: `Add a note for ${firstName} (optional)`,
        stepVerb: 'Schedule',
        busyLabel: 'Scheduling…',
      }}
      timeZone={browserTimeZone()}
      problem={problem ? problemCopy(problem, firstName) : null}
    />
  );
}
