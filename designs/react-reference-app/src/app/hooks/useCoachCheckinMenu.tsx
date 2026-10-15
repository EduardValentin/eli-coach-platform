import { useState } from 'react';
import { toast } from 'sonner';
import { rescheduleAction, type CheckinMenuAction } from '../components/CheckinCard';
import { CheckinProposeTimeDialog } from '../components/CheckinProposeTimeDialog';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { useCheckins } from '../context/CheckinContext';
import { useMessaging } from '../context/MessagingContext';
import { canCancelApproved, proposalFor, type CheckIn } from '../domain/checkins';
import { firstNameOf } from '../utils/clientHelpers';
import { formatCheckinDate, formatCheckinTime } from '../utils/dateFormatters';

export function useCoachCheckinMenu() {
  const { findCheckin, cancelCheckin } = useCheckins();
  const { addSystemMessage, sendMessage } = useMessaging();
  const [proposingFor, setProposingFor] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CheckIn | null>(null);

  const proposingCheckin = proposingFor ? findCheckin(proposingFor) ?? null : null;

  const rescheduleOf = (c: CheckIn): CheckinMenuAction | undefined =>
    rescheduleAction(proposalFor(c, 'coach'), () => setProposingFor(c.id));

  const cancelOf = (c: CheckIn): CheckinMenuAction | undefined =>
    canCancelApproved(c, 'coach') ? { onSelect: () => setCancelTarget(c) } : undefined;

  const handleProposed = (c: CheckIn) => {
    addSystemMessage(
      c.clientId,
      `Coach proposed rescheduling to ${formatCheckinDate(c.date)} at ${formatCheckinTime(c.time)}`,
      'checkin-rescheduled',
    );
    if (c.newTimeNote) sendMessage(c.clientId, c.newTimeNote, 'coach');
    toast.success('New time proposed');
  };

  const confirmCancel = () => {
    if (!cancelTarget) return;
    cancelCheckin(cancelTarget.id);
    addSystemMessage(cancelTarget.clientId, 'Check-in cancelled', 'checkin-cancelled');
    toast.success(`Cancelled check-in with ${cancelTarget.clientName}`);
    setCancelTarget(null);
  };

  const dialogs = (
    <>
      <CheckinProposeTimeDialog
        checkin={proposingCheckin}
        party="coach"
        noteLabel={
          proposingCheckin
            ? `Add a note for ${firstNameOf(proposingCheckin.clientName)}`
            : ''
        }
        onOpenChange={(open) => {
          if (!open) setProposingFor(null);
        }}
        onProposed={handleProposed}
      />

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title="Cancel this check-in?"
        description={
          cancelTarget
            ? `${formatCheckinDate(cancelTarget.date)} at ${formatCheckinTime(cancelTarget.time)} with ${cancelTarget.clientName}.`
            : undefined
        }
        cancelLabel="Keep"
        confirmLabel="Cancel check-in"
        onConfirm={confirmCancel}
        tone="destructive"
      />
    </>
  );

  return { rescheduleOf, cancelOf, dialogs };
}
