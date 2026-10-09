import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { CalendarDays, CalendarPlus, Clock } from 'lucide-react';
import { useCheckins } from '../../context/CheckinContext';
import {
  canCancelApproved,
  canPropose,
  canWithdrawRequest,
  proposesNewTime,
  type CheckIn,
} from '../../domain/checkins';
import { useNotifications } from '../../context/NotificationContext';
import { useMessaging } from '../../context/MessagingContext';
import {
  formatCheckinDate,
  formatCheckinTime,
  toISODate,
  to24h,
} from '../../utils/dateFormatters';
import {
  CheckinCard,
  type CheckinRowActions,
} from '../../components/CheckinCard';
import {
  CheckinListing,
  type CheckinEmptyCopy,
} from '../../components/CheckinListing';
import type { CheckinTab } from '../../utils/checkinListing';
import { CheckinSchedulerSheet } from '../../components/CheckinSchedulerSheet';
import { JoinMeetLink } from '../../components/JoinMeetLink';
import { useCheckinAnswers, type CheckinAnswer } from '../../hooks/useCheckinAnswers';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { checkinAnchorId, checkinIdFromSearch } from '../../utils/checkinLinks';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { toast } from 'sonner';

const CLIENT_AVATARS: Record<string, string | null> = {
  c1: 'https://i.pravatar.cc/150?img=47',
  c2: 'https://i.pravatar.cc/150?img=45',
  c3: null,
  c4: null,
  c5: null,
};

const EMPTY_COPY: Record<CheckinTab, CheckinEmptyCopy> = {
  upcoming: {
    icon: CalendarDays,
    title: 'No upcoming check-ins',
    description: 'Approved check-ins with your clients show up here.',
  },
  requests: {
    icon: CalendarPlus,
    title: 'No open requests',
    description: 'Requests from your clients and the ones you send show up here.',
  },
  past: {
    icon: Clock,
    title: 'No past check-ins yet',
    description: 'Passed and cancelled check-ins show up here.',
  },
};

const BUSY_LABEL: Record<CheckinAnswer, string> = {
  approve: 'Approving…',
  decline: 'Declining…',
  withdraw: 'Cancelling…',
};

function tabHoldingCheckin(
  checkinId: string | null,
  groups: Record<CheckinTab, CheckIn[]>,
): CheckinTab {
  if (!checkinId) return 'requests';
  const tabs = Object.keys(groups) as CheckinTab[];
  return (
    tabs.find((tab) => groups[tab].some((c) => c.id === checkinId)) ??
    'requests'
  );
}

function CheckinAnchor({
  checkinId,
  children,
}: {
  checkinId: string;
  children: ReactNode;
}) {
  return (
    <div id={checkinAnchorId(checkinId)} tabIndex={-1} className="rounded-card">
      {children}
    </div>
  );
}

function firstName(fullName: string): string {
  return fullName.split(' ')[0];
}

export function CoachCheckins() {
  const {
    statusOf,
    getPendingCheckins,
    getUpcomingCheckins,
    getPastCheckins,
    cancelCheckin,
    proposeNewTime,
    getBookedSlots,
  } = useCheckins();
  const { addNotification } = useNotifications();
  const { addSystemMessage, sendMessage: ctxSendMessage } = useMessaging();
  const { answer, answerInFlight } = useCheckinAnswers();

  const pending = getPendingCheckins();
  const upcoming = getUpcomingCheckins();
  const past = getPastCheckins();

  const [searchParams] = useSearchParams();
  const focusedCheckinId = checkinIdFromSearch(searchParams);
  const [focusedTab] = useState<CheckinTab>(() =>
    tabHoldingCheckin(focusedCheckinId, { upcoming, requests: pending, past }),
  );

  useEffect(() => {
    if (!focusedCheckinId) return;
    const card = document.getElementById(checkinAnchorId(focusedCheckinId));
    card?.scrollIntoView({ block: 'center' });
    card?.focus({ preventScroll: true });
  }, [focusedCheckinId]);

  const [rescheduleTarget, setRescheduleTarget] = useState<CheckIn | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [rescheduleMsg, setRescheduleMsg] = useState('');
  const [cancelTarget, setCancelTarget] = useState<CheckIn | null>(null);

  const bookedSlots = useMemo(
    () => (rescheduleDate ? getBookedSlots(toISODate(rescheduleDate)) : []),
    [rescheduleDate, getBookedSlots],
  );

  const handleApprove = (c: CheckIn) =>
    answer(c, 'approve', () => {
      addSystemMessage(
        c.clientId,
        `Check-in confirmed for ${formatCheckinDate(c.date)} at ${formatCheckinTime(c.time)}`,
        'checkin-scheduled',
      );
      toast.success(`Approved check-in with ${c.clientName}`);
      addNotification({
        title: 'Check-in Approved',
        message: `${c.clientName}'s check-in on ${formatCheckinDate(c.date)} has been confirmed.`,
        link: '/coach/checkins',
      });
    });

  const handleDecline = (c: CheckIn) =>
    answer(c, 'decline', () => {
      addSystemMessage(c.clientId, 'Check-in cancelled', 'checkin-cancelled');
      toast.success('Check-in declined');
    });

  const handleWithdraw = (c: CheckIn) =>
    answer(c, 'withdraw', () => {
      addSystemMessage(c.clientId, 'Check-in request cancelled', 'checkin-cancelled');
      toast.success('Request cancelled');
    });

  const answering = (c: CheckIn) => answerInFlight(c) !== null;

  const busyLabel = (c: CheckIn, action: CheckinAnswer, label: string) =>
    answerInFlight(c) === action ? BUSY_LABEL[action] : label;

  const confirmCancel = () => {
    if (!cancelTarget) return;
    cancelCheckin(cancelTarget.id);
    addSystemMessage(cancelTarget.clientId, 'Check-in cancelled', 'checkin-cancelled');
    toast.success(`Cancelled check-in with ${cancelTarget.clientName}`);
    setCancelTarget(null);
  };

  const openReschedule = (c: CheckIn) => {
    setRescheduleTarget(c);
    setRescheduleDate(undefined);
    setRescheduleTime(null);
    setRescheduleMsg('');
  };

  const handleSubmitReschedule = () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return;
    const checkin = rescheduleTarget;
    const date = toISODate(rescheduleDate);
    const time = to24h(rescheduleTime);
    const ok = proposeNewTime(
      checkin.id,
      { date, time },
      'coach',
      rescheduleMsg || undefined,
    );
    if (!ok) {
      toast.error('Maximum reschedule limit reached');
      return;
    }
    addSystemMessage(
      checkin.clientId,
      `Coach proposed rescheduling to ${formatCheckinDate(date)} at ${formatCheckinTime(time)}`,
      'checkin-rescheduled',
    );
    if (rescheduleMsg) {
      ctxSendMessage(checkin.clientId, rescheduleMsg, 'coach');
    }
    toast.success('New time proposed');
    addNotification({
      title: 'Reschedule Proposed',
      message: `Coach proposed rescheduling ${checkin.clientName}'s check-in to ${formatCheckinDate(date)} at ${formatCheckinTime(time)}.`,
      link: '/portal/messages',
      mvpLink: '/portal/checkins',
    });
    setRescheduleTarget(null);
  };

  const waitingActions = (c: CheckIn): CheckinRowActions => ({
    shown: canWithdrawRequest(c, 'coach') ? (
      <Button
        onClick={() => handleWithdraw(c)}
        disabled={answering(c)}
        aria-busy={answerInFlight(c) === 'withdraw' || undefined}
        variant="outline"
        size="xs"
      >
        {busyLabel(c, 'withdraw', 'Cancel request')}
      </Button>
    ) : undefined,
  });

  const answerActions = (c: CheckIn): CheckinRowActions => ({
    shown: (
      <>
        <Button
          onClick={() => handleDecline(c)}
          disabled={answering(c)}
          aria-busy={answerInFlight(c) === 'decline' || undefined}
          variant="ghost"
          size="xs"
        >
          {busyLabel(c, 'decline', 'Decline')}
        </Button>
        <Button
          onClick={() => handleApprove(c)}
          disabled={answering(c)}
          aria-busy={answerInFlight(c) === 'approve' || undefined}
          variant="primary"
          size="xs"
        >
          {busyLabel(c, 'approve', proposesNewTime(c) ? 'Accept' : 'Approve')}
        </Button>
      </>
    ),
    menu: {
      reschedule: canPropose(c) ? () => openReschedule(c) : undefined,
      disabled: answering(c),
    },
  });

  const upcomingActions = (c: CheckIn): CheckinRowActions => ({
    shown: <JoinMeetLink checkin={c} party="coach" size="xs" />,
    menu: {
      reschedule:
        c.kind !== 'program-review' && canPropose(c)
          ? () => openReschedule(c)
          : undefined,
      cancel: canCancelApproved(c, 'coach') ? () => setCancelTarget(c) : undefined,
    },
  });

  const card = (c: CheckIn, actions: CheckinRowActions) => (
    <CheckinAnchor key={c.id} checkinId={c.id}>
      <CheckinCard
        checkin={c}
        status={statusOf(c)}
        viewer={{ party: 'coach', counterpartName: firstName(c.clientName) }}
        attendee={{
          name: c.clientName,
          imageUrl: CLIENT_AVATARS[c.clientId] ?? undefined,
        }}
        footnote={c.planId ? 'Linked to training plan' : undefined}
        actions={actions}
        actionSize="xs"
      />
    </CheckinAnchor>
  );

  const actionsFor = (c: CheckIn, tab: CheckinTab): CheckinRowActions => {
    if (tab === 'upcoming') return upcomingActions(c);
    if (tab === 'past') return {};
    return c.proposedBy === 'coach' ? waitingActions(c) : answerActions(c);
  };

  return (
    <div className="w-full" data-parity-root="CoachCheckins">
      <PortalPageHeader
        title="Check-ins"
        subtitle="Manage all client check-ins in one place."
      />

      <CheckinListing
        party="coach"
        defaultTab={focusedTab}
        waitingForLabel="Waiting for clients"
        search={{ placeholder: 'Search by client name' }}
        emptyCopy={EMPTY_COPY}
        renderCheckin={(c, tab) => card(c, actionsFor(c, tab))}
      />

      <CheckinSchedulerSheet
        open={rescheduleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRescheduleTarget(null);
        }}
        variant="reschedule"
        title="Propose a new time"
        description={
          rescheduleTarget
            ? `Currently set for ${formatCheckinDate(rescheduleTarget.date)} · ${formatCheckinTime(rescheduleTarget.time)}`
            : undefined
        }
        selectedDate={rescheduleDate}
        onDateChange={setRescheduleDate}
        selectedTime={rescheduleTime}
        onTimeChange={setRescheduleTime}
        bookedSlots={bookedSlots}
        onSubmit={handleSubmitReschedule}
        submitLabel="Propose"
        showMessageField
        message={rescheduleMsg}
        onMessageChange={setRescheduleMsg}
        messagePlaceholder="Add a note for the client (optional)"
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
    </div>
  );
}
