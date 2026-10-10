import {
  useCheckins,
  type CheckinClient,
  type CheckinRequestResult,
} from '../context/CheckinContext';
import type { CheckIn } from '../domain/checkins';
import { useCheckinPicker, type CheckinChoice } from '../hooks/useCheckinPicker';
import { browserTimeZone } from '../utils/dateFormatters';
import {
  CheckinSchedulerSheet,
  TIME_TAKEN_COPY,
  type CheckinPickerWording,
} from './CheckinSchedulerSheet';

type RequestRefusal = Exclude<CheckinRequestResult['status'], 'requested'>;

const PROBLEM_COPY: Record<RequestRefusal | 'failed', string> = {
  time_taken: TIME_TAKEN_COPY,
  request_waiting: 'You already have a check-in request waiting. You can send another once it is answered.',
  failed: "Your request didn't go through. Try again.",
};

const WORDING: CheckinPickerWording = {
  noteLabel: 'Add a note for your coach (optional)',
  stepVerb: 'Request',
  busyLabel: 'Requesting…',
};

export function CheckinRequestDialog({
  open,
  onOpenChange,
  client,
  onRequested,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: CheckinClient;
  onRequested: (checkin: CheckIn) => void;
}) {
  const { requestCheckin } = useCheckins();

  const send = async ({ startsAt, note }: CheckinChoice): Promise<RequestRefusal | null> => {
    const result = await requestCheckin({ client, startsAt, note });
    if (result.status !== 'requested') return result.status;

    onRequested(result.checkin);
    return null;
  };

  const { problem, sheet } = useCheckinPicker({ open, onOpenChange, send });

  return (
    <CheckinSchedulerSheet
      {...sheet}
      variant="request"
      title="Request a check-in"
      description="Pick a date and time that works for you. Your coach will confirm or suggest another time."
      wording={WORDING}
      timeZone={browserTimeZone()}
      problem={problem ? PROBLEM_COPY[problem] : null}
    />
  );
}
