import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { CalendarDays, CalendarPlus, Clock, X } from 'lucide-react';
import {
  useCheckins,
  type CheckIn,
  MAX_RESCHEDULES,
} from '../../context/CheckinContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import {
  PROGRAM_REVIEW_LABEL,
  upcomingReviewCall,
} from '../../utils/reviewCallListing';
import { browserTimeZone } from '../../utils/dateFormatters';
import { useNotifications } from '../../context/NotificationContext';
import { useMessaging } from '../../context/MessagingContext';
import {
  formatCheckinDate,
  formatCheckinTime,
  toISODate,
  to24h,
} from '../../utils/dateFormatters';
import { AppointmentCard } from '../../components/coach-portal/AppointmentCard';
import { CheckinCard } from '../../components/CheckinCard';
import { CheckinSchedulerSheet } from '../../components/CheckinSchedulerSheet';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { EmptyState } from '../../components/EmptyState';
import { checkinAnchorId, checkinIdFromSearch } from '../../utils/checkinLinks';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { toast } from 'sonner';

const CLIENT_AVATARS: Record<string, string | null> = {
  c1: 'https://i.pravatar.cc/150?img=47',
  c2: 'https://i.pravatar.cc/150?img=45',
  c3: null,
  c4: null,
  c5: null,
};

type CheckinTab = 'pending' | 'upcoming' | 'past';

function tabHoldingCheckin(
  checkinId: string | null,
  groups: Record<CheckinTab, CheckIn[]>,
): CheckinTab {
  if (!checkinId) return 'pending';
  const tabs = Object.keys(groups) as CheckinTab[];
  return (
    tabs.find((tab) => groups[tab].some((c) => c.id === checkinId)) ?? 'pending'
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

export function CoachCheckins() {
  const {
    checkins,
    getPendingCheckins,
    getUpcomingCheckins,
    approveCheckin,
    declineCheckin,
    rescheduleCheckin,
    acceptReschedule,
    getBookedSlots,
  } = useCheckins();
  const { demoJourney } = useClientJourneys();
  const reviewCall = upcomingReviewCall(demoJourney, new Date());
  const { addNotification } = useNotifications();
  const { addSystemMessage, sendMessage: ctxSendMessage } = useMessaging();

  const pending = getPendingCheckins();
  const awaitingCoach = pending.filter((c) => c.proposedBy === 'client').length;
  const upcoming = getUpcomingCheckins();
  const past = checkins.filter(
    (c) =>
      c.status === 'completed' ||
      c.status === 'declined' ||
      c.status === 'cancelled',
  );

  const [searchParams] = useSearchParams();
  const focusedCheckinId = checkinIdFromSearch(searchParams);
  const [tab, setTab] = useState<CheckinTab>(() =>
    tabHoldingCheckin(focusedCheckinId, { pending, upcoming, past }),
  );

  useEffect(() => {
    if (!focusedCheckinId) return;
    const card = document.getElementById(checkinAnchorId(focusedCheckinId));
    card?.scrollIntoView({ block: 'center' });
    card?.focus({ preventScroll: true });
  }, [focusedCheckinId]);

  // Reschedule state
  const [rescheduleTarget, setRescheduleTarget] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [rescheduleMsg, setRescheduleMsg] = useState('');

  const bookedSlots = useMemo(
    () => (rescheduleDate ? getBookedSlots(toISODate(rescheduleDate)) : []),
    [rescheduleDate, getBookedSlots],
  );

  const handleApprove = (c: CheckIn) => {
    approveCheckin(c.id);
    addSystemMessage(
      c.clientId,
      `Check-in confirmed for ${formatCheckinDate(c.date)} at ${formatCheckinTime(c.time)}`,
      'checkin-scheduled',
    );
    toast.success(`Approved check-in for ${c.clientName}`);
    addNotification({
      title: 'Check-in Approved',
      message: `${c.clientName}'s check-in on ${formatCheckinDate(c.date)} has been confirmed.`,
      link: '/coach/checkins',
    });
  };

  const handleDecline = (c: CheckIn) => {
    declineCheckin(c.id);
    addSystemMessage(c.clientId, 'Check-in cancelled', 'checkin-cancelled');
    toast.success('Check-in cancelled');
  };

  const handleAcceptReschedule = (c: CheckIn) => {
    acceptReschedule(c.id);
    addSystemMessage(
      c.clientId,
      `Check-in confirmed for ${formatCheckinDate(c.date)} at ${formatCheckinTime(c.time)}`,
      'checkin-scheduled',
    );
    toast.success('Reschedule accepted');
    addNotification({
      title: 'Check-in Confirmed',
      message: `Check-in with ${c.clientName} confirmed for ${formatCheckinDate(c.date)} at ${formatCheckinTime(c.time)}.`,
      link: '/coach/checkins',
    });
  };

  const openReschedule = (checkinId: string) => {
    setRescheduleTarget(checkinId);
    setRescheduleDate(undefined);
    setRescheduleTime(null);
    setRescheduleMsg('');
  };

  const handleSubmitReschedule = () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return;
    const checkin = pending.find((c) => c.id === rescheduleTarget);
    if (!checkin) return;
    const date = toISODate(rescheduleDate);
    const time = to24h(rescheduleTime);
    const ok = rescheduleCheckin(
      rescheduleTarget,
      date,
      time,
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
    toast.success('Reschedule proposed');
    addNotification({
      title: 'Reschedule Proposed',
      message: `Coach proposed rescheduling ${checkin.clientName}'s check-in to ${formatCheckinDate(date)} at ${formatCheckinTime(time)}.`,
      link: '/portal/messages',
      mvpLink: '/portal/checkins',
    });
    setRescheduleTarget(null);
  };

  const renderPendingActions = (c: CheckIn) => {
    const isRescheduling = c.status === 'rescheduling';
    const canReschedule = c.rescheduleCount < MAX_RESCHEDULES;
    const proposedByClient = c.proposedBy === 'client';

    // The status badge already says Awaiting {clientFirstName} when the coach proposed.
    if (!proposedByClient) return undefined;

    return (
      <>
        <Button onClick={() => handleDecline(c)} variant="ghost" size="xs">
          Decline
        </Button>
        {canReschedule && (
          <Button
            onClick={() => openReschedule(c.id)}
            variant="outline"
            size="xs"
          >
            Reschedule
          </Button>
        )}
        {isRescheduling ? (
          <Button
            onClick={() => handleAcceptReschedule(c)}
            variant="primary"
            size="xs"
          >
            Accept
          </Button>
        ) : (
          <Button onClick={() => handleApprove(c)} variant="primary" size="xs">
            Approve
          </Button>
        )}
      </>
    );
  };

  return (
    <div className="w-full">
      <PortalPageHeader
        title="Check-ins"
        subtitle="Manage all client check-ins in one place."
      />

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as CheckinTab)}
        className="w-full"
      >
        <div className="mb-6 flex flex-col gap-2">
          <TabsList variant="segmented">
            <TabsTrigger variant="segmented" value="pending">
              Pending
              {awaitingCoach > 0 && (
                <Badge variant="count">{awaitingCoach}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger variant="segmented" value="upcoming">
              Upcoming
            </TabsTrigger>
            <TabsTrigger variant="segmented" value="past">
              Past
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pending" className="space-y-3">
          {pending.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title="No pending check-ins"
              description="All requests have been reviewed."
            />
          ) : (
            pending.map((c) => (
              <CheckinAnchor key={c.id} checkinId={c.id}>
                <CheckinCard
                  checkin={c}
                  viewer="coach"
                  attendee={{
                    name: c.clientName,
                    imageUrl: CLIENT_AVATARS[c.clientId] ?? undefined,
                  }}
                  footnote={c.planId ? 'Linked to training plan' : undefined}
                  actions={renderPendingActions(c)}
                />
              </CheckinAnchor>
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-3">
          {reviewCall && (
            <AppointmentCard
              attendee={{
                name: `${demoJourney.identity.firstName} ${demoJourney.identity.lastName}`.trim(),
              }}
              when={{
                startsAt: reviewCall.startsAt,
                timeZone: browserTimeZone(),
              }}
              badges={
                <Badge variant="brand-secondary">{PROGRAM_REVIEW_LABEL}</Badge>
              }
            />
          )}
          {upcoming.length === 0 && !reviewCall ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming check-ins"
              description="Confirmed check-ins with your clients show up here."
            />
          ) : (
            upcoming.map((c) => (
              <CheckinAnchor key={c.id} checkinId={c.id}>
                <CheckinCard
                  checkin={c}
                  viewer="coach"
                  attendee={{
                    name: c.clientName,
                    imageUrl: CLIENT_AVATARS[c.clientId] ?? undefined,
                  }}
                  footnote={c.planId ? 'Linked to training plan' : undefined}
                />
              </CheckinAnchor>
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {past.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No past check-ins yet"
              description="Completed, declined and cancelled check-ins show up here."
            />
          ) : (
            past.map((c) => (
              <CheckinAnchor key={c.id} checkinId={c.id}>
                <CheckinCard
                  checkin={c}
                  viewer="coach"
                  attendee={{
                    name: c.clientName,
                    imageUrl: CLIENT_AVATARS[c.clientId] ?? undefined,
                  }}
                  footnote={c.planId ? 'Linked to training plan' : undefined}
                  muted
                />
              </CheckinAnchor>
            ))
          )}
        </TabsContent>
      </Tabs>

      <CheckinSchedulerSheet
        open={!!rescheduleTarget}
        onOpenChange={(open) => {
          if (!open) setRescheduleTarget(null);
        }}
        variant="reschedule"
        title="Propose a new time"
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
    </div>
  );
}
