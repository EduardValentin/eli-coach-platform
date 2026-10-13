import { useState } from 'react';
import { CalendarDays, CalendarPlus, Clock } from 'lucide-react';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import {
  CheckinCard,
  rescheduleAction,
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
  canWithdrawRequest,
  proposalFor,
  proposesNewTime,
  type CheckIn,
} from '../../domain/checkins';
import { useMessaging } from '../../context/MessagingContext';
import { useCoachProfile } from '../../context/CoachProfileContext';
import {
  formatCheckinDate,
  formatCheckinTime,
} from '../../utils/dateFormatters';
import { CheckinProposeTimeDialog } from '../../components/CheckinProposeTimeDialog';
import { CheckinRequestDialog } from '../../components/CheckinRequestDialog';
import { useCheckinAnswers, type CheckinAnswer } from '../../hooks/useCheckinAnswers';
import type { CheckinTab } from '../../utils/checkinListing';
import { Button } from '../../components/ui/button';
import { DisabledActionHint } from '../../components/DisabledActionHint';
import { toast } from 'sonner';

const CLIENT_ID = DEMO_CLIENT.id;
const CLIENT_NAME = DEMO_CLIENT.name;

const OPEN_REQUEST_REASON = 'You can send another request once this one is answered.';

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
    findCheckin,
    cancelCheckin,
    hasOpenClientRequest,
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

  const openRequest = hasOpenClientRequest(CLIENT_ID);

  const [showRequest, setShowRequest] = useState(false);
  const [proposingFor, setProposingFor] = useState<string | null>(null);
  const [movingReview, setMovingReview] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<CheckIn | null>(null);

  const proposingCheckin = proposingFor ? findCheckin(proposingFor) ?? null : null;

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
    setProposingFor(c.id);
  };

  const handleProposed = (c: CheckIn) => {
    addSystemMessage(
      CLIENT_ID,
      `${CLIENT_NAME} proposed rescheduling to ${formatCheckinDate(c.date)} at ${formatCheckinTime(c.time)}`,
      'checkin-rescheduled',
    );
    if (c.newTimeNote) ctxSendMessage(CLIENT_ID, c.newTimeNote, 'client');
    toast.success('New time proposed');
  };

  const renderRequestButton = ({
    className,
    iconSize,
  }: {
    className: string;
    iconSize: number;
  }) => {
    const button = (
      <Button
        type="button"
        onClick={() => setShowRequest(true)}
        variant="primary"
        size="md"
        className={className}
      >
        <CalendarPlus size={iconSize} aria-hidden="true" />
        Request check-in
      </Button>
    );

    return openRequest ? (
      <DisabledActionHint reason={OPEN_REQUEST_REASON}>{button}</DisabledActionHint>
    ) : (
      button
    );
  };

  const upcomingActions = (c: CheckIn): CheckinRowActions => ({
    shown: statusOf(c) === 'clash' ? undefined : <JoinMeetLink checkin={c} party="client" />,
    menu: {
      reschedule: rescheduleAction(proposalFor(c, 'client'), () => openReschedule(c)),
      cancel: canCancelApproved(c, 'client') ? { onSelect: () => setCancelTarget(c) } : undefined,
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
      reschedule: rescheduleAction(proposalFor(c, 'client'), () => openReschedule(c)),
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
        actions={renderRequestButton({ className: 'hidden sm:inline-flex', iconSize: 16 })}
      />

      <CheckinListing
        party="client"
        clientId={CLIENT_ID}
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

      <CheckinProposeTimeDialog
        checkin={proposingCheckin}
        party="client"
        noteLabel="Add a note for your coach (optional)"
        onOpenChange={(open) => {
          if (!open) setProposingFor(null);
        }}
        onProposed={handleProposed}
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

      {renderRequestButton({
        className: 'fixed left-4 bottom-(--portal-tab-bar-clearance) z-40 shadow-lg sm:hidden',
        iconSize: 18,
      })}
    </div>
  );
}
