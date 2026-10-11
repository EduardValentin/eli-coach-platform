import {
  useCheckins,
  type CheckinProposalResult,
} from '../context/CheckinContext';
import type { CheckIn, CheckinParty } from '../domain/checkins';
import { NO_LONGER_WAITING } from '../hooks/useCheckinAnswers';
import { useCheckinPicker, type CheckinChoice } from '../hooks/useCheckinPicker';
import {
  browserTimeZone,
  formatCheckinDate,
  formatCheckinTime,
} from '../utils/dateFormatters';
import { CheckinSchedulerSheet, TIME_TAKEN_COPY } from './CheckinSchedulerSheet';

type ProposalRefusal = Exclude<CheckinProposalResult['status'], 'proposed'>;

const PROBLEM_COPY: Record<ProposalRefusal | 'failed', string> = {
  time_taken: TIME_TAKEN_COPY,
  moves_exhausted: "This check-in can't be moved any more.",
  not_pending: NO_LONGER_WAITING,
  failed: "The new time wasn't proposed. Try again.",
};

function currentTimeOf(checkin: CheckIn | null): string | undefined {
  if (!checkin) return undefined;

  return `Currently set for ${formatCheckinDate(checkin.date)} · ${formatCheckinTime(checkin.time)}`;
}

export function CheckinProposeTimeDialog({
  checkin,
  party,
  noteLabel,
  onOpenChange,
  onProposed,
}: {
  checkin: CheckIn | null;
  party: CheckinParty;
  noteLabel: string;
  onOpenChange: (open: boolean) => void;
  onProposed: (checkin: CheckIn) => void;
}) {
  const { proposeNewTime } = useCheckins();

  const send = async ({ startsAt, note }: CheckinChoice): Promise<ProposalRefusal | null> => {
    if (!checkin) return 'not_pending';

    const result = await proposeNewTime({ checkinId: checkin.id, party, startsAt, note });
    if (result.status !== 'proposed') return result.status;

    onProposed(result.checkin);
    return null;
  };

  const { problem, sheet } = useCheckinPicker({
    open: checkin !== null,
    onOpenChange,
    clientId: checkin?.clientId ?? '',
    send,
  });

  return (
    <CheckinSchedulerSheet
      {...sheet}
      variant="request"
      title="Propose a new time"
      description={currentTimeOf(checkin)}
      wording={{ noteLabel, stepVerb: 'Propose', busyLabel: 'Proposing…' }}
      timeZone={browserTimeZone()}
      problem={problem ? PROBLEM_COPY[problem] : null}
    />
  );
}
