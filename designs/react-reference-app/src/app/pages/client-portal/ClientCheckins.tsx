import { useState, useMemo } from 'react';
import { CalendarDays, CalendarPlus, Clock } from 'lucide-react';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import {
  CheckinCard,
  type CheckinRowActions,
} from '../../components/CheckinCard';
import {
  CheckinListing,
  type CheckinEmptyCopy,
} from '../../components/CheckinListing';
import { JoinMeetLink } from '../../components/JoinMeetLink';
import { ReviewCallScheduler } from '../../components/client-portal/ReviewCallScheduler';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { DEMO_CLIENT, useCheckins } from '../../context/CheckinContext';
import {
  canCancelApproved,
  canPropose,
  canWithdrawRequest,
  proposesNewTime,
  type CheckIn,
} from '../../domain/checkins';
import { useMessaging } from '../../context/MessagingContext';
import { useCoachProfile } from '../../context/CoachProfileContext';
import {
  formatCheckinDate,
  formatCheckinTime,
  toISODate,
  to24h,
} from '../../utils/dateFormatters';
import { CheckinSchedulerSheet } from '../../components/CheckinSchedulerSheet';
import { CheckinRequestDialog } from '../../components/CheckinRequestDialog';
import { useCheckinAnswers, type CheckinAnswer } from '../../hooks/useCheckinAnswers';
import type { CheckinTab } from '../../utils/checkinListing';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

const CLIENT_ID = DEMO_CLIENT.id;
const CLIENT_NAME = DEMO_CLIENT.name;

const BUSY_LABEL: Record<CheckinAnswer, string> = {
  approve: 'Approving…',
  decline: 'Declining…',
  withdraw: 'Cancelling…',
};

const EMPTY_COPY: Record<CheckinTab, CheckinEmptyCopy> = {
  upcoming: {
    icon: CalendarDays,
    title: 'No upcoming check-ins',
    description: 'Request one any time using the button above.',
  },
  requests: {
    icon: CalendarPlus,
    title: 'No open requests',
    description: 'Requests you send and proposals from your coach show up here.',
  },
  past: {
    icon: Clock,
    title: 'No past check-ins yet',
    description: 'Passed and cancelled check-ins will appear here.',
  },
};

export function ClientCheckins() {
  const {
    statusOf,
    cancelCheckin,
    proposeNewTime,
    getUpcomingCheckins,
    getPendingCheckins,
    hasOpenClientRequest,
    getBookedSlots,
  } = useCheckins();
  const { addSystemMessage, sendMessage: ctxSendMessage } = useMessaging();
  const { answer, answerInFlight } = useCheckinAnswers();
  const { coachProfile } = useCoachProfile();
  const coachName = coachProfile.name;
  const coach = {
    name: coachName,
    imageUrl: coachProfile.avatarUrl ?? undefined,
  };
  const viewer = { party: 'client' as const, counterpartName: 'your coach' };

  const upcoming = getUpcomingCheckins(CLIENT_ID);
  const pending = getPendingCheckins(CLIENT_ID);
  const openRequest = hasOpenClientRequest(CLIENT_ID);

  const [showRequest, setShowRequest] = useState(false);

  const [rescheduleTarget, setRescheduleTarget] = useState<string | null>(null);
  const [rsDate, setRsDate] = useState<Date | undefined>();
  const [rsTime, setRsTime] = useState<string | null>(null);
  const [rsMsg, setRsMsg] = useState('');

  const [movingReview, setMovingReview] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<CheckIn | null>(null);

  const bookedSlots = useMemo(
    () => (rescheduleTarget && rsDate ? getBookedSlots(toISODate(rsDate)) : []),
    [rescheduleTarget, rsDate, getBookedSlots],
  );

  const rescheduleTargetCheckin = useMemo(
    () =>
      [...upcoming, ...pending].find((c) => c.id === rescheduleTarget) ?? null,
    [upcoming, pending, rescheduleTarget],
  );

  const handleRequested = (c: CheckIn) => {
    ctxSendMessage(
      CLIENT_ID,
      `Check-in requested: ${formatCheckinDate(c.date)} at ${formatCheckinTime(c.time)}`,
      'client',
    );
    toast.success(`Check-in requested for ${formatCheckinDate(c.date)}`);
  };

  const handleApprove = (c: CheckIn) =>
    answer(c, 'approve', () => {
      addSystemMessage(
        CLIENT_ID,
        `Check-in confirmed for ${formatCheckinDate(c.date)} at ${formatCheckinTime(c.time)}`,
        'checkin-scheduled',
      );
      toast.success('Check-in approved');
    });

  const handleDecline = (c: CheckIn) =>
    answer(c, 'decline', () => {
      addSystemMessage(CLIENT_ID, 'Check-in cancelled', 'checkin-cancelled');
      toast.success('Check-in declined');
    });

  const handleWithdraw = (c: CheckIn) =>
    answer(c, 'withdraw', () => {
      addSystemMessage(
        CLIENT_ID,
        'Check-in request cancelled',
        'checkin-cancelled',
      );
      toast.success('Request cancelled');
    });

  const busyLabel = (c: CheckIn, action: CheckinAnswer, label: string) =>
    answerInFlight(c) === action ? BUSY_LABEL[action] : label;

  const confirmCancel = () => {
    if (!cancelTarget) return;
    cancelCheckin(cancelTarget.id);
    addSystemMessage(CLIENT_ID, 'Check-in cancelled', 'checkin-cancelled');
    toast.success('Check-in cancelled');
    setCancelTarget(null);
  };

  const openReschedule = (c: CheckIn) => {
    if (c.kind === 'program-review') {
      setMovingReview(true);
      return;
    }
    setRescheduleTarget(c.id);
    setRsDate(undefined);
    setRsTime(null);
    setRsMsg('');
  };

  const handleSubmitReschedule = () => {
    if (!rescheduleTarget || !rsDate || !rsTime) return;
    const date = toISODate(rsDate);
    const time = to24h(rsTime);
    const ok = proposeNewTime(
      rescheduleTarget,
      { date, time },
      'client',
      rsMsg || undefined,
    );
    if (!ok) {
      toast.error('Maximum reschedule limit reached');
      return;
    }
    addSystemMessage(
      CLIENT_ID,
      `${CLIENT_NAME} proposed rescheduling to ${formatCheckinDate(date)} at ${formatCheckinTime(time)}`,
      'checkin-rescheduled',
    );
    if (rsMsg) ctxSendMessage(CLIENT_ID, rsMsg, 'client');
    toast.success('New time proposed');
    setRescheduleTarget(null);
  };

  const requestButtonProps = {
    type: 'button' as const,
    onClick: () => setShowRequest(true),
    disabled: openRequest,
    'aria-describedby': openRequest ? 'open-request-note' : undefined,
    variant: 'primary' as const,
    size: 'md' as const,
  };

  const upcomingActions = (c: CheckIn): CheckinRowActions => ({
    shown: <JoinMeetLink checkin={c} party="client" />,
    menu: {
      reschedule: canPropose(c) ? () => openReschedule(c) : undefined,
      cancel: canCancelApproved(c, 'client') ? () => setCancelTarget(c) : undefined,
    },
  });

  const waitingActions = (c: CheckIn): CheckinRowActions => ({
    shown: canWithdrawRequest(c, 'client') ? (
      <Button
        type="button"
        onClick={() => handleWithdraw(c)}
        disabled={answerInFlight(c) !== null}
        aria-busy={answerInFlight(c) === 'withdraw' || undefined}
        variant="outline"
        size="sm"
      >
        {busyLabel(c, 'withdraw', 'Cancel request')}
      </Button>
    ) : undefined,
  });

  const answerActions = (c: CheckIn): CheckinRowActions => ({
    shown: (
      <>
        <Button
          type="button"
          onClick={() => handleDecline(c)}
          disabled={answerInFlight(c) !== null}
          aria-busy={answerInFlight(c) === 'decline' || undefined}
          variant="ghost"
          size="sm"
        >
          {busyLabel(c, 'decline', 'Decline')}
        </Button>
        <Button
          type="button"
          onClick={() => handleApprove(c)}
          disabled={answerInFlight(c) !== null}
          aria-busy={answerInFlight(c) === 'approve' || undefined}
          variant="primary"
          size="sm"
        >
          {busyLabel(c, 'approve', proposesNewTime(c) ? 'Accept' : 'Approve')}
        </Button>
      </>
    ),
    menu: {
      reschedule: canPropose(c) ? () => openReschedule(c) : undefined,
      disabled: answerInFlight(c) !== null,
    },
  });

  const actionsFor = (c: CheckIn, tab: CheckinTab): CheckinRowActions => {
    if (tab === 'upcoming') return upcomingActions(c);
    if (tab === 'past') return {};
    return c.proposedBy === 'client' ? waitingActions(c) : answerActions(c);
  };

  return (
    <div className="w-full" data-parity-root="ClientCheckins">
      <PortalPageHeader
        title="Check-ins"
        subtitle="Request a check-in, answer proposals, and look back at past sessions."
        actions={
          <div className="flex flex-col gap-2 sm:items-end">
            <Button {...requestButtonProps} className="hidden sm:inline-flex">
              <CalendarPlus size={16} aria-hidden="true" />
              Request check-in
            </Button>
            {openRequest && (
              <p
                id="open-request-note"
                className="text-xs text-text-secondary sm:text-right"
              >
                You can send another request once this one is answered.
              </p>
            )}
          </div>
        }
      />

      <CheckinListing
        party="client"
        clientId={CLIENT_ID}
        defaultTab="upcoming"
        waitingForLabel="Waiting for your coach"
        emptyCopy={EMPTY_COPY}
        renderCheckin={(c, tab) => (
          <CheckinCard
            checkin={c}
            status={statusOf(c)}
            viewer={viewer}
            attendee={coach}
            actions={actionsFor(c, tab)}
          />
        )}
      />

      <CheckinRequestDialog
        open={showRequest}
        onOpenChange={setShowRequest}
        client={DEMO_CLIENT}
        onRequested={handleRequested}
      />

      <CheckinSchedulerSheet
        open={Boolean(rescheduleTarget)}
        onOpenChange={(open) => {
          if (!open) setRescheduleTarget(null);
        }}
        variant="reschedule"
        title="Propose a new time"
        description={
          rescheduleTargetCheckin
            ? `Currently set for ${formatCheckinDate(rescheduleTargetCheckin.date)} · ${formatCheckinTime(rescheduleTargetCheckin.time)}`
            : undefined
        }
        selectedDate={rsDate}
        onDateChange={setRsDate}
        selectedTime={rsTime}
        onTimeChange={setRsTime}
        bookedSlots={bookedSlots}
        onSubmit={handleSubmitReschedule}
        submitLabel="Propose"
        showMessageField
        message={rsMsg}
        onMessageChange={setRsMsg}
        messagePlaceholder="Add a note for your coach (optional)"
      />

      <ReviewCallScheduler open={movingReview} onOpenChange={setMovingReview} />

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title="Cancel this check-in?"
        description={
          cancelTarget
            ? `${formatCheckinDate(cancelTarget.date)} at ${formatCheckinTime(cancelTarget.time)}.`
            : undefined
        }
        cancelLabel="Keep"
        confirmLabel="Cancel check-in"
        onConfirm={confirmCancel}
        tone="destructive"
      />

      <Button
        {...requestButtonProps}
        className="fixed left-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 shadow-lg sm:hidden"
      >
        <CalendarPlus size={18} aria-hidden="true" />
        Request check-in
      </Button>
    </div>
  );
}
