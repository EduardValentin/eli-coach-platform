import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Send, Paperclip, Check, CheckCheck, MoreVertical, User, Archive, Trash2, BellOff, Pin, Flag, CalendarPlus, CalendarDays, Activity, X } from 'lucide-react';
import { useSearchParams, Link } from 'react-router';
import { useNotifications } from '../../context/NotificationContext';
import { useCheckins } from '../../context/CheckinContext';
import { useMessaging } from '../../context/MessagingContext';
import { formatCheckinDate, formatCheckinTime, toISODate, to24h } from '../../utils/dateFormatters';
import { DateTimePicker } from '../../components/DateTimePicker';
import { CheckinActionCard } from '../../components/CheckinActionCard';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator
} from '../../components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction
} from '../../components/ui/alert-dialog';
import { toast } from 'sonner';

export function CoachMessages() {
  const [searchParams] = useSearchParams();
  const { conversations, getMessages, sendMessage: ctxSendMessage, addSystemMessage } = useMessaging();
  const initialClientId = searchParams.get('client') || conversations[0]?.id || 'c1';

  const [activeClient, setActiveClient] = useState(initialClientId);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotifications();
  const {
    getPendingCheckins, getUpcomingCheckins, getActionableCheckins,
    approveCheckin, declineCheckin, rescheduleCheckin, acceptReschedule,
    coachInitiateCheckin, getBookedSlots
  } = useCheckins();

  const messages = getMessages(activeClient);
  const activeConversation = conversations.find(c => c.id === activeClient);

  const actionableForClient = useMemo(
    () => getActionableCheckins(activeClient, 'coach'),
    [getActionableCheckins, activeClient]
  );
  const nextCheckin = useMemo(() => getUpcomingCheckins(activeClient)[0], [getUpcomingCheckins, activeClient]);

  // Coach-initiate check-in state
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState<string | null>(null);
  const [scheduleNote, setScheduleNote] = useState('');

  // Reschedule state
  const [rescheduleTarget, setRescheduleTarget] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [rescheduleMsg, setRescheduleMsg] = useState('');

  const bookedSlots = useMemo(() => {
    if (showSchedulePicker && scheduleDate) return getBookedSlots(toISODate(scheduleDate));
    if (rescheduleTarget && rescheduleDate) return getBookedSlots(toISODate(rescheduleDate));
    return [];
  }, [showSchedulePicker, scheduleDate, rescheduleTarget, rescheduleDate, getBookedSlots]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeClient, actionableForClient]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    ctxSendMessage(activeClient, message, 'coach');
    setMessage('');

    setTimeout(() => {
      ctxSendMessage(activeClient, 'Got it, thanks for letting me know!', 'client');
      addNotification({
        title: activeConversation?.name || 'Client',
        message: 'Got it, thanks for letting me know!',
        link: `/coach/messages?client=${activeClient}`
      });
    }, 3000);
  };

  const handleCoachSchedule = () => {
    if (!scheduleDate || !scheduleTime || !activeConversation) return;
    const date = toISODate(scheduleDate);
    const time = to24h(scheduleTime);
    coachInitiateCheckin({
      clientId: activeClient,
      clientName: activeConversation.name,
      date,
      time,
      note: scheduleNote || undefined,
    });

    addSystemMessage(activeClient, `Coach scheduled a check-in for ${formatCheckinDate(date)} at ${formatCheckinTime(time)}`, 'checkin-scheduled');
    if (scheduleNote) {
      ctxSendMessage(activeClient, scheduleNote, 'coach');
    }
    toast.success(`Check-in scheduled for ${activeConversation.name}`);
    addNotification({
      title: 'Check-in Scheduled',
      message: `Coach scheduled a check-in with ${activeConversation.name} for ${formatCheckinDate(date)} at ${formatCheckinTime(time)}.`,
      link: '/portal/messages',
    });

    setShowSchedulePicker(false);
    setScheduleDate(undefined);
    setScheduleTime(null);
    setScheduleNote('');
  };

  const handleApprove = (checkinId: string) => {
    const checkin = actionableForClient.find(c => c.id === checkinId);
    if (!checkin) return;
    approveCheckin(checkinId);
    addSystemMessage(activeClient, `Check-in confirmed for ${formatCheckinDate(checkin.date)} at ${formatCheckinTime(checkin.time)}`, 'checkin-scheduled');
    toast.success(`Check-in approved for ${checkin.clientName}`);
    addNotification({
      title: 'Check-in Approved',
      message: `${checkin.clientName}'s check-in on ${formatCheckinDate(checkin.date)} has been confirmed.`,
      link: '/coach/checkins',
    });
  };

  const handleDecline = (checkinId: string) => {
    declineCheckin(checkinId);
    addSystemMessage(activeClient, 'Check-in cancelled', 'checkin-cancelled');
    toast.success('Check-in cancelled');
  };

  const handleReschedule = (checkinId: string) => {
    setRescheduleTarget(checkinId);
    setRescheduleDate(undefined);
    setRescheduleTime(null);
    setRescheduleMsg('');
  };

  const handleSubmitReschedule = () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return;
    const date = toISODate(rescheduleDate);
    const time = to24h(rescheduleTime);
    const ok = rescheduleCheckin(rescheduleTarget, date, time, 'coach', rescheduleMsg || undefined);
    if (!ok) {
      toast.error('Maximum reschedule limit reached');
      return;
    }

    addSystemMessage(activeClient, `Coach proposed rescheduling to ${formatCheckinDate(date)} at ${formatCheckinTime(time)}`, 'checkin-rescheduled');
    if (rescheduleMsg) {
      ctxSendMessage(activeClient, rescheduleMsg, 'coach');
    }
    toast.success('Reschedule proposed');
    addNotification({
      title: 'Reschedule Proposed',
      message: `Coach proposed rescheduling to ${formatCheckinDate(date)} at ${formatCheckinTime(time)}.`,
      link: '/portal/messages',
    });

    setRescheduleTarget(null);
    setRescheduleDate(undefined);
    setRescheduleTime(null);
    setRescheduleMsg('');
  };

  const handleAcceptReschedule = (checkinId: string) => {
    const checkin = actionableForClient.find(c => c.id === checkinId);
    if (!checkin) return;
    acceptReschedule(checkinId);
    addSystemMessage(activeClient, `Check-in confirmed for ${formatCheckinDate(checkin.date)} at ${formatCheckinTime(checkin.time)}`, 'checkin-scheduled');
    toast.success('Reschedule accepted');
    addNotification({
      title: 'Check-in Confirmed',
      message: `Check-in confirmed for ${formatCheckinDate(checkin.date)} at ${formatCheckinTime(checkin.time)}.`,
      link: '/coach/checkins',
    });
  };

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-[calc(100vh-6rem)] lg:h-[calc(100vh-8rem)] flex bg-white rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 overflow-hidden">

      {/* Sidebar */}
      <div className="w-full md:w-80 border-r border-neutral-100 flex flex-col hidden md:flex shrink-0">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="font-serif text-2xl text-[#121212] mb-4">Messages</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#C81D6B] focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => { setActiveClient(conv.id); setRescheduleTarget(null); setShowSchedulePicker(false); }}
              className={`w-full text-left p-4 flex items-start gap-3 border-b border-neutral-50 transition-colors ${
                activeClient === conv.id ? 'bg-[#C81D6B]/5' : 'hover:bg-neutral-50'
              }`}
            >
              <div className="relative shrink-0">
                {conv.avatar ? (
                  <img src={conv.avatar} alt={conv.name} className="w-12 h-12 rounded-full object-cover border border-neutral-200" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 flex items-center justify-center font-serif text-[#121212] font-semibold">
                    {conv.initial}
                  </div>
                )}
                {conv.status === 'Active' && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <p className={`text-sm truncate ${activeClient === conv.id ? 'font-bold text-[#121212]' : 'font-semibold text-neutral-700'}`}>
                    {conv.name}
                  </p>
                  <p className="text-[10px] text-neutral-400 shrink-0 ml-2">{conv.time}</p>
                </div>
                <p className={`text-xs truncate ${conv.unread > 0 ? 'font-semibold text-[#121212]' : 'text-neutral-500'}`}>
                  {conv.lastMessage}
                </p>
              </div>
              {conv.unread > 0 && (
                <div className="w-5 h-5 rounded-full bg-[#C81D6B] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {conv.unread}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-[#FAFAFA]">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="h-20 px-6 border-b border-neutral-100 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                {activeConversation.avatar ? (
                  <img src={activeConversation.avatar} alt={activeConversation.name} className="w-10 h-10 rounded-full object-cover border border-neutral-200" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center font-serif text-[#121212] font-semibold">
                    {activeConversation.initial}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-[#121212]">{activeConversation.name}</h3>
                  <p className="text-xs text-green-600 font-medium">Active</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-neutral-400">
                <button
                  onClick={() => { setShowSchedulePicker(!showSchedulePicker); setRescheduleTarget(null); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
                    showSchedulePicker
                      ? 'bg-[#C81D6B] text-white'
                      : 'bg-[#C81D6B]/10 text-[#C81D6B] hover:bg-[#C81D6B] hover:text-white'
                  }`}
                >
                  <CalendarPlus size={14} />
                  <span className="hidden sm:inline">Schedule</span>
                </button>
                <Link to={`/coach/clients/${activeConversation.id}`} className="p-2 hover:text-[#121212] hover:bg-neutral-100 rounded-full transition-colors flex items-center justify-center" title="View Profile">
                  <User size={18} />
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 hover:text-[#121212] hover:bg-neutral-100 rounded-full transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg border-neutral-100">
                    <DropdownMenuItem
                      className="gap-3 rounded-lg cursor-pointer"
                      onClick={() => { setIsPinned(!isPinned); toast.success(isPinned ? 'Conversation unpinned' : 'Conversation pinned'); }}
                    >
                      <Pin size={15} className={isPinned ? 'text-[#C81D6B]' : ''} />
                      {isPinned ? 'Unpin conversation' : 'Pin conversation'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-3 rounded-lg cursor-pointer"
                      onClick={() => { setIsMuted(!isMuted); toast.success(isMuted ? 'Notifications unmuted' : 'Notifications muted'); }}
                    >
                      <BellOff size={15} className={isMuted ? 'text-[#C81D6B]' : ''} />
                      {isMuted ? 'Unmute notifications' : 'Mute notifications'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-3 rounded-lg cursor-pointer"
                      onClick={() => toast.success('Conversation flagged for follow-up')}
                    >
                      <Flag size={15} />
                      Flag for follow-up
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-3 rounded-lg cursor-pointer"
                      onClick={() => toast.success('Conversation archived')}
                    >
                      <Archive size={15} />
                      Archive conversation
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-3 rounded-lg cursor-pointer text-red-600 focus:text-red-600"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 size={15} />
                      Delete conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Upcoming check-in banner */}
            {nextCheckin && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-6 mt-4 px-4 py-3 bg-[#121212]/5 border border-neutral-200 rounded-2xl flex items-center gap-3"
              >
                <CalendarDays size={16} className="text-[#121212] shrink-0" />
                <span className="text-sm text-[#121212] font-medium">
                  Next check-in: <span className="font-semibold">{formatCheckinDate(nextCheckin.date)} at {formatCheckinTime(nextCheckin.time)}</span>
                </span>
                {nextCheckin.type === 'recurring' && (
                  <span className="ml-auto text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Weekly</span>
                )}
              </motion.div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg) => {
                const isCoach = msg.sender === 'coach';
                const isSystem = msg.sender === 'system';

                if (isSystem) {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-center"
                    >
                      <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-medium border ${
                        msg.systemType === 'plan-update'
                          ? 'bg-[#00796B]/5 border-[#00796B]/20 text-[#00796B]'
                          : msg.systemType === 'checkin-cancelled'
                            ? 'bg-red-50 border-red-200 text-red-600'
                            : msg.systemType === 'checkin-rescheduled'
                              ? 'bg-[#C81D6B]/5 border-[#C81D6B]/20 text-[#C81D6B]'
                              : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                      }`}>
                        <Activity size={14} />
                        {msg.text}
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id}
                    className={`flex flex-col ${isCoach ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-end gap-2 max-w-[80%]">
                      {!isCoach && activeConversation && (
                        activeConversation.avatar ? (
                          <img src={activeConversation.avatar} alt="" className="w-6 h-6 rounded-full object-cover border border-neutral-200 shrink-0 mb-1" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white border border-neutral-200 flex items-center justify-center font-serif text-xs shrink-0 mb-1">
                            {activeConversation.initial}
                          </div>
                        )
                      )}

                      <div className={`p-4 rounded-2xl text-sm ${
                        isCoach
                          ? 'bg-[#121212] text-white rounded-br-sm'
                          : 'bg-white border border-neutral-100 shadow-sm text-[#121212] rounded-bl-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mt-1 px-8">
                      <span className="text-[10px] text-neutral-400 font-medium">
                        {msg.time}
                      </span>
                      {isCoach && (
                        <span className="text-neutral-400">
                          {msg.status === 'read' ? <CheckCheck size={12} className="text-blue-500" /> : <Check size={12} />}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Actionable check-in cards */}
              {actionableForClient.map(checkin => (
                <div key={checkin.id}>
                  {rescheduleTarget === checkin.id ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="max-w-[90%] p-5 rounded-2xl border-2 border-[#C81D6B]/30 bg-[#C81D6B]/5 rounded-bl-sm"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-[#C81D6B] uppercase tracking-widest">Propose a new time</span>
                        <button onClick={() => setRescheduleTarget(null)} className="p-1 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-600 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
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
                    </motion.div>
                  ) : (
                    <CheckinActionCard
                      checkin={checkin}
                      role="coach"
                      onApprove={() => handleApprove(checkin.id)}
                      onDecline={() => handleDecline(checkin.id)}
                      onReschedule={() => handleReschedule(checkin.id)}
                      onAcceptReschedule={() => handleAcceptReschedule(checkin.id)}
                    />
                  )}
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Coach schedule picker + Input */}
            <div className="bg-white border-t border-neutral-100 shrink-0">
              <AnimatePresence>
                {showSchedulePicker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-b border-neutral-100"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#C81D6B] uppercase tracking-widest">
                          <CalendarPlus size={14} />
                          Schedule a check-in with {activeConversation.name}
                        </div>
                        <button onClick={() => setShowSchedulePicker(false)} className="p-1 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-600 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                      <DateTimePicker
                        selectedDate={scheduleDate}
                        onDateChange={setScheduleDate}
                        selectedTime={scheduleTime}
                        onTimeChange={setScheduleTime}
                        bookedSlots={bookedSlots}
                        onSubmit={handleCoachSchedule}
                        submitLabel="Schedule"
                        showMessageField
                        message={scheduleNote}
                        onMessageChange={setScheduleNote}
                        messagePlaceholder="Add a note (optional)"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSend} className="flex items-end gap-3 p-4">
                <button type="button" className="h-[56px] w-[56px] flex items-center justify-center text-neutral-400 hover:text-[#121212] transition-colors rounded-2xl hover:bg-neutral-50 shrink-0">
                  <Paperclip size={22} />
                </button>
                <div className="flex-1 bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#C81D6B] focus-within:ring-1 focus-within:ring-[#C81D6B] transition-all overflow-hidden">
                  <textarea
                    rows={1}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full bg-transparent p-4 outline-none text-sm resize-none max-h-32 min-h-[56px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="h-[56px] w-[56px] flex items-center justify-center bg-[#C81D6B] text-white rounded-2xl hover:bg-[#a31556] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-md"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
            Select a conversation to start messaging
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-[#121212]">
              Delete this conversation?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Your entire message history with <span className="font-semibold text-[#121212]">{activeConversation?.name}</span> will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row gap-3 mt-2">
            <AlertDialogCancel className="flex-1 rounded-xl border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowDeleteDialog(false); toast.success('Conversation deleted'); }}
              className="flex-1 rounded-xl bg-red-600 text-white hover:bg-red-700 font-semibold shadow-sm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
