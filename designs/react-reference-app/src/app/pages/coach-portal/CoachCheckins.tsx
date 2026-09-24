import { useState, useMemo } from 'react';
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
} from 'lucide-react';
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
  checkinInstant,
  formatCheckinDate,
  formatCheckinTime,
  toISODate,
  to24h,
} from '../../utils/dateFormatters';
import { AppointmentCard } from '../../components/coach-portal/AppointmentCard';
import { CheckinSchedulerSheet } from '../../components/CheckinSchedulerSheet';
import { PortalPageHeader } from '../../components/PortalPageHeader';
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

function requestsWaitingLine(count: number): string {
  return count === 1
    ? '1 request waiting on you'
    : `${count} requests waiting on you`;
}

function CheckinCard({
  checkin,
  actions,
}: {
  checkin: CheckIn;
  actions?: React.ReactNode;
}) {
  const isRescheduling = checkin.status === 'rescheduling';
  const timeZone = browserTimeZone();
  const supersededWhen =
    isRescheduling && checkin.previousDate && checkin.previousTime
      ? {
          startsAt: checkinInstant(checkin.previousDate, checkin.previousTime),
          timeZone,
        }
      : undefined;

  return (
    <AppointmentCard
      attendee={{
        name: checkin.clientName,
        imageUrl: CLIENT_AVATARS[checkin.clientId] ?? undefined,
      }}
      when={{ startsAt: checkinInstant(checkin.date, checkin.time), timeZone }}
      supersededWhen={supersededWhen}
      badges={
        <>
          <span
            className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
              checkin.type === 'ad-hoc'
                ? 'bg-status-pending-soft text-status-pending'
                : 'bg-neutral-100 text-text-secondary'
            }`}
          >
            {checkin.type}
          </span>
          {isRescheduling && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-brand bg-brand/10 px-2 py-0.5 rounded-full">
              <RefreshCw size={10} />
              Rescheduled by{' '}
              {checkin.proposedBy === 'coach' ? 'you' : checkin.clientName}
            </span>
          )}
          {checkin.rescheduleCount > 0 && !isRescheduling && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
              <RefreshCw size={10} />
              {checkin.rescheduleCount} reschedule
              {checkin.rescheduleCount > 1 ? 's' : ''}
            </span>
          )}
        </>
      }
      quote={checkin.rescheduleMessage || checkin.note || undefined}
      footnote={checkin.planId ? 'Linked to training plan' : undefined}
      actions={actions}
    />
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

    // Only show actions if proposed by client (coach needs to respond)
    if (!proposedByClient)
      return (
        <span className="text-[10px] font-bold text-brand uppercase tracking-widest">
          Awaiting response
        </span>
      );

    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {isRescheduling ? (
            <Button
              onClick={() => handleAcceptReschedule(c)}
              variant="default"
              size="sm"
            >
              Accept
            </Button>
          ) : (
            <Button
              onClick={() => handleApprove(c)}
              variant="default"
              size="sm"
            >
              Approve
            </Button>
          )}
          {canReschedule && (
            <Button
              onClick={() => openReschedule(c.id)}
              variant="outline-primary"
              size="sm"
            >
              Reschedule
            </Button>
          )}
          <Button onClick={() => handleDecline(c)} variant="outline" size="sm">
            Decline
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <PortalPageHeader
        title="Check-ins"
        subtitle="Manage all client check-ins in one place."
      />

      <Tabs defaultValue="pending" className="w-full">
        <div className="mb-6 flex flex-col gap-2">
          <TabsList variant="segmented">
            <TabsTrigger variant="segmented" value="pending">
              Pending
            </TabsTrigger>
            <TabsTrigger variant="segmented" value="upcoming">
              Upcoming
            </TabsTrigger>
            <TabsTrigger variant="segmented" value="past">
              Past
            </TabsTrigger>
          </TabsList>
          {awaitingCoach > 0 && (
            <p className="text-sm text-text-secondary">
              {requestsWaitingLine(awaitingCoach)}
            </p>
          )}
        </div>

        <TabsContent value="pending" className="space-y-3">
          {pending.length === 0 ? (
            <div className="text-center py-16">
              <CalendarPlus
                size={40}
                className="mx-auto text-neutral-300 mb-4"
              />
              <p className="text-text-secondary font-medium">
                No pending check-ins
              </p>
              <p className="text-sm text-text-secondary mt-1">
                All requests have been reviewed.
              </p>
            </div>
          ) : (
            pending.map((c) => (
              <CheckinCard
                key={c.id}
                checkin={c}
                actions={renderPendingActions(c)}
              />
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
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-brand-secondary-surface text-brand-secondary">
                  {PROGRAM_REVIEW_LABEL}
                </span>
              }
            />
          )}
          {upcoming.length === 0 && !reviewCall ? (
            <div className="text-center py-16">
              <CalendarDays
                size={40}
                className="mx-auto text-neutral-300 mb-4"
              />
              <p className="text-text-secondary font-medium">
                No upcoming check-ins
              </p>
            </div>
          ) : (
            upcoming.map((c) => (
              <CheckinCard
                key={c.id}
                checkin={c}
                actions={
                  <span className="flex items-center gap-1.5 text-green-600 text-xs font-semibold">
                    <CheckCircle2 size={14} />
                    Confirmed
                  </span>
                }
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {past.length === 0 ? (
            <div className="text-center py-16">
              <Clock size={40} className="mx-auto text-neutral-300 mb-4" />
              <p className="text-text-secondary font-medium">
                No past check-ins yet
              </p>
            </div>
          ) : (
            past.map((c) => (
              <CheckinCard
                key={c.id}
                checkin={c}
                actions={
                  <span
                    className={`flex items-center gap-1.5 text-xs font-semibold ${
                      c.status === 'completed'
                        ? 'text-green-600'
                        : c.status === 'cancelled'
                          ? 'text-text-secondary'
                          : 'text-red-500'
                    }`}
                  >
                    {c.status === 'completed' ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <XCircle size={14} />
                    )}
                    {c.status === 'completed'
                      ? 'Completed'
                      : c.status === 'cancelled'
                        ? 'Cancelled'
                        : 'Declined'}
                  </span>
                }
              />
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
