import { useState, useMemo, ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  CalendarDays, CalendarPlus, Clock, CheckCircle2, XCircle, RefreshCw, Video,
} from 'lucide-react';
import { useCheckins, type CheckIn, MAX_RESCHEDULES } from '../../context/CheckinContext';
import { useMessaging } from '../../context/MessagingContext';
import { useCoachProfile } from '../../context/CoachProfileContext';
import { formatCheckinDate, formatCheckinTime, toISODate, to24h } from '../../utils/dateFormatters';
import { CheckinSchedulerSheet } from '../../components/CheckinSchedulerSheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';

const CLIENT_ID = 'c1';
const CLIENT_NAME = 'Jane Doe';
const MEET_URL = 'https://meet.google.com/mock-eli-checkin';

export function ClientCheckins() {
  const {
    checkins, requestCheckin, approveCheckin, declineCheckin,
    rescheduleCheckin, acceptReschedule, getUpcomingCheckins, getPendingCheckins,
    hasPendingAdHoc, getBookedSlots,
  } = useCheckins();
  const { addSystemMessage, sendMessage: ctxSendMessage } = useMessaging();
  const { coachProfile } = useCoachProfile();
  const coachName = coachProfile.name;

  const upcoming = getUpcomingCheckins(CLIENT_ID);
  const pending = getPendingCheckins(CLIENT_ID); // pending + rescheduling
  const past = useMemo(
    () => checkins
      .filter(c => c.clientId === CLIENT_ID && (c.status === 'completed' || c.status === 'declined' || c.status === 'cancelled'))
      .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)),
    [checkins]
  );

  const needsResponseCount = pending.filter(c => c.proposedBy === 'coach').length;
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
    () => [...upcoming, ...pending].find(c => c.id === rescheduleTarget) ?? null,
    [upcoming, pending, rescheduleTarget]
  );

  // ── Handlers (mirror the in-chat flow so the conversation stays in sync) ──
  const handleRequest = () => {
    if (!reqDate || !reqTime) return;
    const date = toISODate(reqDate);
    const time = to24h(reqTime);
    const result = requestCheckin({ clientId: CLIENT_ID, clientName: CLIENT_NAME, date, time });
    if (!result) { toast.error('You already have a pending check-in request'); return; }
    setShowRequest(false);
    setReqDate(undefined);
    setReqTime(null);
    ctxSendMessage(CLIENT_ID, `Check-in requested: ${formatCheckinDate(date)} at ${formatCheckinTime(time)}`, 'client');
    toast.success(`Check-in requested for ${formatCheckinDate(date)}`);
  };

  const handleApprove = (c: CheckIn) => {
    approveCheckin(c.id);
    addSystemMessage(CLIENT_ID, `Check-in confirmed for ${formatCheckinDate(c.date)} at ${formatCheckinTime(c.time)}`, 'checkin-scheduled');
    toast.success('Check-in confirmed');
  };

  const handleAcceptReschedule = (c: CheckIn) => {
    acceptReschedule(c.id);
    addSystemMessage(CLIENT_ID, `Check-in confirmed for ${formatCheckinDate(c.date)} at ${formatCheckinTime(c.time)}`, 'checkin-scheduled');
    toast.success('Check-in confirmed');
  };

  const handleDecline = (c: CheckIn) => {
    declineCheckin(c.id);
    addSystemMessage(CLIENT_ID, 'Check-in cancelled', 'checkin-cancelled');
    toast.success('Check-in declined');
  };

  const handleCancelRequest = (c: CheckIn) => {
    declineCheckin(c.id);
    addSystemMessage(CLIENT_ID, 'Check-in request cancelled', 'checkin-cancelled');
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
    const ok = rescheduleCheckin(rescheduleTarget, date, time, 'client', rsMsg || undefined);
    if (!ok) { toast.error('Maximum reschedule limit reached'); return; }
    addSystemMessage(CLIENT_ID, `${CLIENT_NAME} proposed rescheduling to ${formatCheckinDate(date)} at ${formatCheckinTime(time)}`, 'checkin-rescheduled');
    if (rsMsg) ctxSendMessage(CLIENT_ID, rsMsg, 'client');
    toast.success('Reschedule proposed');
    setRescheduleTarget(null);
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#121212] leading-tight">Check-ins</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Request time with {coachName}, respond to proposals, and review past sessions.
        </p>
      </header>

      <Tabs defaultValue="upcoming" className="w-full">
        {/* Tabs + desktop CTA on one row, vertically centered */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <TabsList className="bg-neutral-100 rounded-2xl p-1">
          <TabsTrigger value="upcoming" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 sm:px-5 py-2.5 text-sm font-semibold">
            Upcoming {upcoming.length > 0 && <span className="ml-1.5 text-neutral-400">({upcoming.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 sm:px-5 py-2.5 text-sm font-semibold">
            Requests
            {needsResponseCount > 0 && (
              <span className="ml-1.5 w-5 h-5 rounded-full bg-[#803a1e] text-white text-[10px] font-bold inline-flex items-center justify-center">{needsResponseCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 sm:px-5 py-2.5 text-sm font-semibold">
            Past
          </TabsTrigger>
          </TabsList>

          {/* Desktop CTA — vertically centered with the tabs (mobile uses the FAB below) */}
          <button
            type="button"
            onClick={() => setShowRequest(true)}
            disabled={pendingExists}
            title={pendingExists ? 'You already have a check-in request awaiting your coach' : 'Request a check-in with your coach'}
            className={`hidden sm:inline-flex items-center gap-2 px-4 min-h-11 rounded-xl text-sm font-bold transition-colors shrink-0 ${
              pendingExists
                ? 'bg-neutral-100 text-neutral-400'
                : 'bg-[#95134F] text-white hover:bg-[#920047] shadow-sm'
            }`}
          >
            {pendingExists ? <Clock size={16} aria-hidden="true" /> : <CalendarPlus size={16} aria-hidden="true" />}
            {pendingExists ? 'Check-in pending' : 'Request check-in'}
          </button>
        </div>

        {/* Upcoming */}
        <TabsContent value="upcoming" className="space-y-3">
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No upcoming check-ins" hint="Request one any time using the button above." />
          ) : (
            upcoming.map(c => (
              <CheckinCard key={c.id} checkin={c}>
                <a
                  href={MEET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 min-h-10 px-4 bg-[#121212] text-white text-xs font-semibold rounded-xl hover:bg-neutral-800 transition-colors"
                >
                  <Video size={14} aria-hidden="true" />
                  Join Meet
                </a>
                {c.rescheduleCount < MAX_RESCHEDULES && (
                  <button
                    type="button"
                    onClick={() => openReschedule(c.id)}
                    className="inline-flex items-center justify-center min-h-10 px-4 bg-white border border-[#95134F]/30 text-[#95134F] text-xs font-semibold rounded-xl hover:bg-[#95134F]/5 transition-colors"
                  >
                    Reschedule
                  </button>
                )}
              </CheckinCard>
            ))
          )}
        </TabsContent>

        {/* Requests */}
        <TabsContent value="requests" className="space-y-3">
          {pending.length === 0 ? (
            <EmptyState icon={CalendarPlus} title="No open requests" hint="Requests you send and proposals from your coach show up here." />
          ) : (
            pending.map(c => {
              const needsResponse = c.proposedBy === 'coach';
              const isRescheduling = c.status === 'rescheduling';
              const canReschedule = c.rescheduleCount < MAX_RESCHEDULES;
              return (
                <CheckinCard key={c.id} checkin={c}>
                  {needsResponse ? (
                    <>
                      <button
                        type="button"
                        onClick={() => isRescheduling ? handleAcceptReschedule(c) : handleApprove(c)}
                        className="inline-flex items-center justify-center min-h-10 px-4 bg-[#121212] text-white text-xs font-semibold rounded-xl hover:bg-neutral-800 transition-colors"
                      >
                        {isRescheduling ? 'Accept' : 'Approve'}
                      </button>
                      {canReschedule && (
                        <button
                          type="button"
                          onClick={() => openReschedule(c.id)}
                          className="inline-flex items-center justify-center min-h-10 px-4 bg-white border border-[#95134F]/30 text-[#95134F] text-xs font-semibold rounded-xl hover:bg-[#95134F]/5 transition-colors"
                        >
                          Reschedule
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDecline(c)}
                        className="inline-flex items-center justify-center min-h-10 px-4 bg-white border border-neutral-200 text-neutral-600 text-xs font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCancelRequest(c)}
                      className="inline-flex items-center justify-center min-h-10 px-4 bg-white border border-neutral-200 text-neutral-600 text-xs font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      Cancel request
                    </button>
                  )}
                </CheckinCard>
              );
            })
          )}
        </TabsContent>

        {/* Past */}
        <TabsContent value="past" className="space-y-3">
          {past.length === 0 ? (
            <EmptyState icon={Clock} title="No past check-ins yet" hint="Completed and cancelled check-ins will appear here." />
          ) : (
            past.map(c => <CheckinCard key={c.id} checkin={c} muted />)
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
        onOpenChange={(open) => { if (!open) setRescheduleTarget(null); }}
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

      {/* Mobile floating action — request a check-in (desktop uses the CTA in the tabs row) */}
      <button
        type="button"
        onClick={() => setShowRequest(true)}
        disabled={pendingExists}
        aria-label={pendingExists ? 'Check-in request pending — awaiting your coach' : 'Request a check-in'}
        title={pendingExists ? 'You already have a check-in request awaiting your coach' : 'Request a check-in with your coach'}
        className={`sm:hidden fixed left-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 inline-flex items-center gap-2 min-h-12 px-5 rounded-full font-bold text-sm shadow-lg transition-colors ${
          pendingExists
            ? 'bg-neutral-200 text-neutral-500'
            : 'bg-[#95134F] text-white hover:bg-[#920047]'
        }`}
      >
        {pendingExists ? <Clock size={18} aria-hidden="true" /> : <CalendarPlus size={18} aria-hidden="true" />}
        {pendingExists ? 'Pending' : 'Request check-in'}
      </button>
    </div>
  );
}

// ── Check-in card ──────────────────────────────────────────────

function CheckinCard({ checkin, children, muted }: { checkin: CheckIn; children?: ReactNode; muted?: boolean }) {
  const isAdHoc = checkin.type === 'ad-hoc';
  const isRescheduling = checkin.status === 'rescheduling';
  const Icon = isAdHoc ? CalendarPlus : CalendarDays;

  const chip = getStatusChip(checkin);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white p-4 sm:p-5 rounded-2xl border border-neutral-100/50 shadow-[0_2px_12px_rgb(0,0,0,0.03)] ${muted ? 'opacity-90' : ''}`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <span className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${
          isAdHoc ? 'bg-[#803a1e]/10 text-[#803a1e]' : 'bg-[#005950]/10 text-[#005950]'
        }`}>
          <Icon size={18} aria-hidden="true" />
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
              isAdHoc ? 'bg-[#803a1e]/10 text-[#803a1e]' : 'bg-neutral-100 text-neutral-500'
            }`}>
              {isAdHoc ? 'Ad-hoc' : 'Weekly'}
            </span>
            {chip && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${chip.cls}`}>
                <chip.Icon size={10} aria-hidden="true" />
                {chip.label}
              </span>
            )}
          </div>

          {isRescheduling && checkin.previousDate && checkin.previousTime && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 line-through mb-0.5">
              <CalendarDays size={12} aria-hidden="true" />
              {formatCheckinDate(checkin.previousDate)} at {formatCheckinTime(checkin.previousTime)}
            </div>
          )}

          <div className="flex items-center gap-x-3 gap-y-0.5 text-sm font-medium text-[#121212] flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} aria-hidden="true" />
              {formatCheckinDate(checkin.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} aria-hidden="true" />
              {formatCheckinTime(checkin.time)}
            </span>
          </div>

          {(checkin.rescheduleMessage || checkin.note) && (
            <p className="text-xs text-neutral-500 italic mt-2">&ldquo;{checkin.rescheduleMessage || checkin.note}&rdquo;</p>
          )}
        </div>
      </div>

      {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
    </motion.div>
  );
}

function getStatusChip(checkin: CheckIn): { label: string; cls: string; Icon: typeof Clock } | null {
  switch (checkin.status) {
    case 'confirmed':
      return { label: 'Confirmed', cls: 'text-[#005950] bg-[#005950]/10', Icon: CheckCircle2 };
    case 'completed':
      return { label: 'Completed', cls: 'text-[#005950] bg-[#005950]/10', Icon: CheckCircle2 };
    case 'declined':
      return { label: 'Declined', cls: 'text-red-500 bg-red-50', Icon: XCircle };
    case 'cancelled':
      return { label: 'Cancelled', cls: 'text-neutral-500 bg-neutral-100', Icon: XCircle };
    case 'rescheduling':
      return checkin.proposedBy === 'coach'
        ? { label: 'Coach proposed a time', cls: 'text-[#95134F] bg-[#95134F]/10', Icon: RefreshCw }
        : { label: 'Awaiting your coach', cls: 'text-neutral-500 bg-neutral-100', Icon: RefreshCw };
    case 'pending':
      return checkin.proposedBy === 'coach'
        ? { label: 'From your coach', cls: 'text-[#803a1e] bg-[#803a1e]/10', Icon: Clock }
        : { label: 'Awaiting your coach', cls: 'text-neutral-500 bg-neutral-100', Icon: Clock };
    default:
      return null;
  }
}

function EmptyState({ icon: Icon, title, hint }: { icon: typeof Clock; title: string; hint: string }) {
  return (
    <div className="text-center py-16">
      <Icon size={40} className="mx-auto text-neutral-300 mb-4" aria-hidden="true" />
      <p className="text-neutral-500 font-medium">{title}</p>
      <p className="text-sm text-neutral-400 mt-1">{hint}</p>
    </div>
  );
}
