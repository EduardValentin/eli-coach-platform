import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarDays, CalendarPlus, Clock, CheckCircle2, XCircle, RefreshCw, X } from 'lucide-react';
import { useCheckins, type CheckIn, MAX_RESCHEDULES } from '../../context/CheckinContext';
import { useNotifications } from '../../context/NotificationContext';
import { useMessaging } from '../../context/MessagingContext';
import { formatCheckinDate, formatCheckinTime, toISODate, to24h } from '../../utils/dateFormatters';
import { DateTimePicker } from '../../components/DateTimePicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '../../components/ui/dialog';
import { toast } from 'sonner';

const CLIENT_AVATARS: Record<string, string | null> = {
  c1: 'https://i.pravatar.cc/150?img=47',
  c2: 'https://i.pravatar.cc/150?img=45',
  c3: null,
  c4: null,
  c5: null,
};

function CheckinCard({ checkin, actions }: { checkin: CheckIn; actions?: React.ReactNode }) {
  const avatar = CLIENT_AVATARS[checkin.clientId];
  const isRescheduling = checkin.status === 'rescheduling';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-5 rounded-2xl border border-neutral-100/50 shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex items-start gap-4"
    >
      {avatar ? (
        <img src={avatar} alt={checkin.clientName} className="w-11 h-11 rounded-full object-cover border border-neutral-200 shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center font-serif text-sm font-semibold text-[#121212] shrink-0">
          {checkin.clientName.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-semibold text-[#121212]">{checkin.clientName}</p>
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
            checkin.type === 'ad-hoc'
              ? 'bg-[#FF7A45]/10 text-[#FF7A45]'
              : 'bg-neutral-100 text-neutral-500'
          }`}>
            {checkin.type}
          </span>
          {isRescheduling && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#C81D6B] bg-[#C81D6B]/10 px-2 py-0.5 rounded-full">
              <RefreshCw size={10} />
              Rescheduled by {checkin.proposedBy === 'coach' ? 'you' : checkin.clientName}
            </span>
          )}
          {checkin.rescheduleCount > 0 && !isRescheduling && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              <RefreshCw size={10} />
              {checkin.rescheduleCount} reschedule{checkin.rescheduleCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Previous time if rescheduled */}
        {isRescheduling && checkin.previousDate && checkin.previousTime && (
          <div className="flex items-center gap-2 text-xs text-neutral-400 line-through mb-0.5">
            <CalendarDays size={12} />
            {formatCheckinDate(checkin.previousDate)} at {formatCheckinTime(checkin.previousTime)}
          </div>
        )}

        <div className="flex items-center gap-3 text-sm text-neutral-600">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={13} />
            {formatCheckinDate(checkin.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            {formatCheckinTime(checkin.time)}
          </span>
        </div>

        {checkin.rescheduleMessage && (
          <p className="text-xs text-neutral-500 italic mt-2">"{checkin.rescheduleMessage}"</p>
        )}
        {!checkin.rescheduleMessage && checkin.note && (
          <p className="text-xs text-neutral-500 italic mt-2">"{checkin.note}"</p>
        )}
        {checkin.planId && (
          <p className="text-[10px] text-neutral-400 mt-1.5">Linked to training plan</p>
        )}
      </div>
      {actions && <div className="flex gap-2 shrink-0 flex-wrap">{actions}</div>}
    </motion.div>
  );
}

export function CoachCheckins() {
  const { checkins, getPendingCheckins, getUpcomingCheckins, approveCheckin, declineCheckin, rescheduleCheckin, acceptReschedule, getBookedSlots } = useCheckins();
  const { addNotification } = useNotifications();
  const { addSystemMessage, sendMessage: ctxSendMessage } = useMessaging();

  const pending = getPendingCheckins();
  const upcoming = getUpcomingCheckins();
  const past = checkins.filter(c => c.status === 'completed' || c.status === 'declined' || c.status === 'cancelled');

  // Reschedule state
  const [rescheduleTarget, setRescheduleTarget] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [rescheduleMsg, setRescheduleMsg] = useState('');

  const bookedSlots = useMemo(
    () => rescheduleDate ? getBookedSlots(toISODate(rescheduleDate)) : [],
    [rescheduleDate, getBookedSlots]
  );

  const handleApprove = (c: CheckIn) => {
    approveCheckin(c.id);
    addSystemMessage(c.clientId, `Check-in confirmed for ${formatCheckinDate(c.date)} at ${formatCheckinTime(c.time)}`, 'checkin-scheduled');
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
    addSystemMessage(c.clientId, `Check-in confirmed for ${formatCheckinDate(c.date)} at ${formatCheckinTime(c.time)}`, 'checkin-scheduled');
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
    const checkin = pending.find(c => c.id === rescheduleTarget);
    if (!checkin) return;
    const date = toISODate(rescheduleDate);
    const time = to24h(rescheduleTime);
    const ok = rescheduleCheckin(rescheduleTarget, date, time, 'coach', rescheduleMsg || undefined);
    if (!ok) {
      toast.error('Maximum reschedule limit reached');
      return;
    }
    addSystemMessage(checkin.clientId, `Coach proposed rescheduling to ${formatCheckinDate(date)} at ${formatCheckinTime(time)}`, 'checkin-rescheduled');
    if (rescheduleMsg) {
      ctxSendMessage(checkin.clientId, rescheduleMsg, 'coach');
    }
    toast.success('Reschedule proposed');
    addNotification({
      title: 'Reschedule Proposed',
      message: `Coach proposed rescheduling ${checkin.clientName}'s check-in to ${formatCheckinDate(date)} at ${formatCheckinTime(time)}.`,
      link: '/portal/messages',
    });
    setRescheduleTarget(null);
  };

  const renderPendingActions = (c: CheckIn) => {
    const isRescheduling = c.status === 'rescheduling';
    const canReschedule = c.rescheduleCount < MAX_RESCHEDULES;
    const proposedByClient = c.proposedBy === 'client';

    // Only show actions if proposed by client (coach needs to respond)
    if (!proposedByClient) return (
      <span className="text-[10px] font-bold text-[#C81D6B] uppercase tracking-widest">Awaiting response</span>
    );

    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {isRescheduling ? (
            <button
              onClick={() => handleAcceptReschedule(c)}
              className="px-4 py-2 bg-[#121212] text-white text-xs font-semibold rounded-xl hover:bg-neutral-800 transition-colors"
            >
              Accept
            </button>
          ) : (
            <button
              onClick={() => handleApprove(c)}
              className="px-4 py-2 bg-[#121212] text-white text-xs font-semibold rounded-xl hover:bg-neutral-800 transition-colors"
            >
              Approve
            </button>
          )}
          {canReschedule && (
            <button
              onClick={() => openReschedule(c.id)}
              className="px-4 py-2 bg-white border border-[#C81D6B]/30 text-[#C81D6B] text-xs font-semibold rounded-xl hover:bg-[#C81D6B]/5 transition-colors"
            >
              Reschedule
            </button>
          )}
          <button
            onClick={() => handleDecline(c)}
            className="px-4 py-2 bg-white border border-neutral-200 text-neutral-600 text-xs font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
          >
            Decline
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-serif font-medium text-[#121212]">Check-ins</h1>
        <p className="text-neutral-500 mt-2">Manage all client check-ins in one place.</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-neutral-100 rounded-2xl p-1 mb-6">
          <TabsTrigger value="pending" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm px-5 py-2.5 text-sm font-semibold">
            Pending {pending.length > 0 && <span className="ml-1.5 w-5 h-5 rounded-full bg-[#FF7A45] text-white text-[10px] font-bold inline-flex items-center justify-center">{pending.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm px-5 py-2.5 text-sm font-semibold">
            Upcoming {upcoming.length > 0 && <span className="ml-1.5 text-neutral-400">({upcoming.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="past" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm px-5 py-2.5 text-sm font-semibold">
            Past
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {pending.length === 0 ? (
            <div className="text-center py-16">
              <CalendarPlus size={40} className="mx-auto text-neutral-300 mb-4" />
              <p className="text-neutral-500 font-medium">No pending check-ins</p>
              <p className="text-sm text-neutral-400 mt-1">All requests have been reviewed.</p>
            </div>
          ) : (
            pending.map(c => (
              <CheckinCard key={c.id} checkin={c} actions={renderPendingActions(c)} />
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-3">
          {upcoming.length === 0 ? (
            <div className="text-center py-16">
              <CalendarDays size={40} className="mx-auto text-neutral-300 mb-4" />
              <p className="text-neutral-500 font-medium">No upcoming check-ins</p>
            </div>
          ) : (
            upcoming.map(c => (
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
              <p className="text-neutral-500 font-medium">No past check-ins yet</p>
            </div>
          ) : (
            past.map(c => (
              <CheckinCard
                key={c.id}
                checkin={c}
                actions={
                  <span className={`flex items-center gap-1.5 text-xs font-semibold ${
                    c.status === 'completed' ? 'text-green-600'
                      : c.status === 'cancelled' ? 'text-neutral-500'
                        : 'text-red-500'
                  }`}>
                    {c.status === 'completed' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {c.status === 'completed' ? 'Completed' : c.status === 'cancelled' ? 'Cancelled' : 'Declined'}
                  </span>
                }
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleTarget} onOpenChange={(open) => { if (!open) setRescheduleTarget(null); }}>
        <DialogContent className="sm:max-w-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-[#121212] font-serif">Propose a new time</DialogTitle>
          </DialogHeader>
          <DateTimePicker
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
