import { useState, useMemo } from 'react';
import { CalendarDays, CalendarPlus, Clock, Video } from 'lucide-react';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { AppointmentCard } from '../../components/coach-portal/AppointmentCard';
import { CheckinCard } from '../../components/CheckinCard';
import { EmptyState } from '../../components/EmptyState';
import { Badge } from '../../components/ui/badge';
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
import { useMessaging } from '../../context/MessagingContext';
import { useCoachProfile } from '../../context/CoachProfileContext';
import {
  formatCheckinDate,
  formatCheckinTime,
  toISODate,
  to24h,
} from '../../utils/dateFormatters';
import { CheckinSchedulerSheet } from '../../components/CheckinSchedulerSheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import { Button, buttonVariants } from '../../components/ui/button';
import { toast } from 'sonner';

const CLIENT_ID = 'c1';
const CLIENT_NAME = 'Jane Doe';
const MEET_URL = 'https://meet.google.com/mock-eli-checkin';

export function ClientCheckins() {
  const {
    checkins,
    requestCheckin,
    approveCheckin,
    declineCheckin,
    rescheduleCheckin,
    acceptReschedule,
    getUpcomingCheckins,
    getPendingCheckins,
    hasPendingAdHoc,
    getBookedSlots,
  } = useCheckins();
  const { addSystemMessage, sendMessage: ctxSendMessage } = useMessaging();
  const { demoJourney } = useClientJourneys();
  const reviewCall = upcomingReviewCall(demoJourney, new Date());
  const { coachProfile } = useCoachProfile();
  const coachName = coachProfile.name;
  const timeZone = browserTimeZone();

  const upcoming = getUpcomingCheckins(CLIENT_ID);
  const pending = getPendingCheckins(CLIENT_ID); // pending + rescheduling
  const past = useMemo(
    () =>
      checkins
        .filter(
          (c) =>
            c.clientId === CLIENT_ID &&
            (c.status === 'completed' ||
              c.status === 'declined' ||
              c.status === 'cancelled'),
        )
        .sort((a, b) =>
          `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
        ),
    [checkins],
  );

  const needsResponseCount = pending.filter(
    (c) => c.proposedBy === 'coach',
  ).length;
  const pendingExists = hasPendingAdHoc(CLIENT_ID);

  // Request scheduler state
  const [showRequest, setShowRequest] = useState(false);
  const [reqDate, setReqDate] = useState<Date | undefined>();
  const [reqTime, setReqTime] = useState<string | null>(null);

  // Reschedule scheduler state
  const [rescheduleTarget, setRescheduleTarget] = useState<string | null>(null);
  const [rsDate, setRsDate] = useState<Date | undefined>();
  const [rsTime, setRsTime] = useState<string | null>(null);
  const [rsMsg, setRsMsg] = useState('');

  const bookedSlots = useMemo(() => {
    if (showRequest && reqDate) return getBookedSlots(toISODate(reqDate));
    if (rescheduleTarget && rsDate) return getBookedSlots(toISODate(rsDate));
    return [];
  }, [showRequest, reqDate, rescheduleTarget, rsDate, getBookedSlots]);

  const rescheduleTargetCheckin = useMemo(
    () =>
      [...upcoming, ...pending].find((c) => c.id === rescheduleTarget) ?? null,
    [upcoming, pending, rescheduleTarget],
  );

  // ── Handlers (mirror the in-chat flow so the conversation stays in sync) ──
  const handleRequest = () => {
    if (!reqDate || !reqTime) return;
    const date = toISODate(reqDate);
    const time = to24h(reqTime);
    const result = requestCheckin({
      clientId: CLIENT_ID,
      clientName: CLIENT_NAME,
      date,
      time,
    });
    if (!result) {
      toast.error('You already have a pending check-in request');
      return;
    }
    setShowRequest(false);
    setReqDate(undefined);
    setReqTime(null);
    ctxSendMessage(
      CLIENT_ID,
      `Check-in requested: ${formatCheckinDate(date)} at ${formatCheckinTime(time)}`,
      'client',
    );
    toast.success(`Check-in requested for ${formatCheckinDate(date)}`);
  };

  const handleApprove = (c: CheckIn) => {
    approveCheckin(c.id);
    addSystemMessage(
      CLIENT_ID,
      `Check-in confirmed for ${formatCheckinDate(c.date)} at ${formatCheckinTime(c.time)}`,
      'checkin-scheduled',
    );
    toast.success('Check-in confirmed');
  };

  const handleAcceptReschedule = (c: CheckIn) => {
    acceptReschedule(c.id);
    addSystemMessage(
      CLIENT_ID,
      `Check-in confirmed for ${formatCheckinDate(c.date)} at ${formatCheckinTime(c.time)}`,
      'checkin-scheduled',
    );
    toast.success('Check-in confirmed');
  };

  const handleDecline = (c: CheckIn) => {
    declineCheckin(c.id);
    addSystemMessage(CLIENT_ID, 'Check-in cancelled', 'checkin-cancelled');
    toast.success('Check-in declined');
  };

  const handleCancelRequest = (c: CheckIn) => {
    declineCheckin(c.id);
    addSystemMessage(
      CLIENT_ID,
      'Check-in request cancelled',
      'checkin-cancelled',
    );
    toast.success('Request cancelled');
  };

  const openReschedule = (id: string) => {
    setRescheduleTarget(id);
    setRsDate(undefined);
    setRsTime(null);
    setRsMsg('');
  };

  const handleSubmitReschedule = () => {
    if (!rescheduleTarget || !rsDate || !rsTime) return;
    const date = toISODate(rsDate);
    const time = to24h(rsTime);
    const ok = rescheduleCheckin(
      rescheduleTarget,
      date,
      time,
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
    toast.success('Reschedule proposed');
    setRescheduleTarget(null);
  };

  return (
    <div className="w-full">
      <PortalPageHeader
        title="Check-ins"
        subtitle={`Request time with ${coachName}, respond to proposals, and review past sessions.`}
      />

      <Tabs variant="segmented" defaultValue="upcoming" className="w-full">
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger
                value="upcoming"
                className="px-4 sm:px-5"
              >
                Upcoming
              </TabsTrigger>
              <TabsTrigger
                value="requests"
                className="px-4 sm:px-5"
              >
                Requests
                {needsResponseCount > 0 && (
                  <Badge tone="count">{needsResponseCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="past"
                className="px-4 sm:px-5"
              >
                Past
              </TabsTrigger>
            </TabsList>

            <Button
              type="button"
              onClick={() => setShowRequest(true)}
              disabled={pendingExists}
              title={
                pendingExists
                  ? 'You already have a check-in request awaiting your coach'
                  : 'Request a check-in with your coach'
              }
              variant="primary"
              size="md"
              className="hidden shrink-0 sm:inline-flex"
            >
              <CalendarPlus size={16} aria-hidden="true" />
              Request check-in
            </Button>
          </div>
        </div>

        {/* Upcoming */}
        <TabsContent value="upcoming" className="space-y-3">
          {reviewCall && (
            <AppointmentCard
              attendee={{
                name: coachName,
                imageUrl: coachProfile.avatarUrl ?? undefined,
              }}
              when={{ startsAt: reviewCall.startsAt, timeZone }}
              badges={
                <Badge tone="brand-secondary">{PROGRAM_REVIEW_LABEL}</Badge>
              }
              footnote={`You and ${coachName} go through your new program together.`}
            />
          )}
          {upcoming.length === 0 && !reviewCall ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming check-ins"
              description="Request one any time using the button above."
            />
          ) : (
            upcoming.map((c) => (
              <CheckinCard
                key={c.id}
                checkin={c}
                viewer="client"
                attendee={{
                  name: coachName,
                  imageUrl: coachProfile.avatarUrl ?? undefined,
                }}
                actions={
                  <>
                    {c.rescheduleCount < MAX_RESCHEDULES && (
                      <Button
                        type="button"
                        onClick={() => openReschedule(c.id)}
                        variant="outline"
                        size="sm"
                      >
                        Reschedule
                      </Button>
                    )}
                    <a
                      href={MEET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({
                        variant: 'outline',
                        size: 'sm',
                      })}
                    >
                      <Video size={14} aria-hidden="true" />
                      Join Meet
                    </a>
                  </>
                }
              />
            ))
          )}
        </TabsContent>

        {/* Requests */}
        <TabsContent value="requests" className="space-y-3">
          {pending.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title="No open requests"
              description="Requests you send and proposals from your coach show up here."
            />
          ) : (
            pending.map((c) => {
              const needsResponse = c.proposedBy === 'coach';
              const isRescheduling = c.status === 'rescheduling';
              const canReschedule = c.rescheduleCount < MAX_RESCHEDULES;
              return (
                <CheckinCard
                  key={c.id}
                  checkin={c}
                  viewer="client"
                  attendee={{
                    name: coachName,
                    imageUrl: coachProfile.avatarUrl ?? undefined,
                  }}
                  actions={
                    needsResponse ? (
                      <>
                        <Button
                          type="button"
                          onClick={() => handleDecline(c)}
                          variant="ghost"
                          size="sm"
                        >
                          Decline
                        </Button>
                        {canReschedule && (
                          <Button
                            type="button"
                            onClick={() => openReschedule(c.id)}
                            variant="outline"
                            size="sm"
                          >
                            Reschedule
                          </Button>
                        )}
                        <Button
                          type="button"
                          onClick={() =>
                            isRescheduling
                              ? handleAcceptReschedule(c)
                              : handleApprove(c)
                          }
                          variant="primary"
                          size="sm"
                        >
                          {isRescheduling ? 'Accept' : 'Approve'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => handleCancelRequest(c)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel request
                      </Button>
                    )
                  }
                />
              );
            })
          )}
        </TabsContent>

        {/* Past */}
        <TabsContent value="past" className="space-y-3">
          {past.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No past check-ins yet"
              description="Completed and cancelled check-ins will appear here."
            />
          ) : (
            past.map((c) => (
              <CheckinCard
                key={c.id}
                checkin={c}
                viewer="client"
                attendee={{
                  name: coachName,
                  imageUrl: coachProfile.avatarUrl ?? undefined,
                }}
                muted
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Request a check-in */}
      <CheckinSchedulerSheet
        open={showRequest}
        onOpenChange={setShowRequest}
        variant="request"
        title="Request a check-in"
        description={`Pick a date and time that works for you. ${coachName} will confirm or propose another slot.`}
        selectedDate={reqDate}
        onDateChange={setReqDate}
        selectedTime={reqTime}
        onTimeChange={setReqTime}
        bookedSlots={bookedSlots}
        onSubmit={handleRequest}
        submitLabel="Request"
      />

      {/* Reschedule */}
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

      <Button
        type="button"
        onClick={() => setShowRequest(true)}
        disabled={pendingExists}
        aria-label={
          pendingExists
            ? 'Check-in request pending — awaiting your coach'
            : 'Request a check-in'
        }
        title={
          pendingExists
            ? 'You already have a check-in request awaiting your coach'
            : 'Request a check-in with your coach'
        }
        variant="primary"
        size="md"
        className="fixed left-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 shadow-lg sm:hidden"
      >
        <CalendarPlus size={18} aria-hidden="true" />
        Request check-in
      </Button>
    </div>
  );
}
