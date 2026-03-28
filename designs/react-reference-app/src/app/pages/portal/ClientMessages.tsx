import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Paperclip, Check, CheckCheck, MoreVertical, Archive, Trash2, BellOff, Search as SearchIcon, CalendarPlus, CalendarDays, Clock, X, Activity } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useNotifications } from '../../context/NotificationContext';
import { useCheckins } from '../../context/CheckinContext';
import { useMessaging } from '../../context/MessagingContext';
import { formatCheckinDate, formatCheckinTime, toISODate } from '../../utils/dateFormatters';
import { Calendar } from '../../components/ui/calendar';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator
} from '../../components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction
} from '../../components/ui/alert-dialog';
import { toast } from 'sonner';

const COACH_PHOTO = 'https://images.unsplash.com/photo-1757347398206-7425300ef990?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicnVuZXR0ZSUyMHNtaWxpbmclMjB3b21hbiUyMHBvcnRyYWl0JTIwb3V0ZG9vcnxlbnwxfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080';

const CLIENT_ID = 'c1';
const CLIENT_NAME = 'Jane Doe';

const TIME_SLOTS = [
  '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
];

function to24h(label: string): string {
  const [time, period] = label.split(' ');
  let [h] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:00`;
}

export function ClientMessages() {
  const [message, setMessage] = useState('');
  const { getMessages, sendMessage: ctxSendMessage } = useMessaging();
  const messages = getMessages(CLIENT_ID);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showCheckinPicker, setShowCheckinPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotifications();
  const { requestCheckin, hasPendingAdHoc, getUpcomingCheckins } = useCheckins();

  const pendingExists = hasPendingAdHoc(CLIENT_ID);
  const nextCheckin = getUpcomingCheckins(CLIENT_ID)[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleScheduleCheckin = () => {
    if (!selectedDate || !selectedTime) return;
    const date = toISODate(selectedDate);
    const time = to24h(selectedTime);
    const result = requestCheckin({ clientId: CLIENT_ID, clientName: CLIENT_NAME, date, time });
    if (!result) {
      toast.error('You already have a pending check-in request');
      return;
    }

    setShowCheckinPicker(false);
    setSelectedDate(undefined);
    setSelectedTime(null);

    ctxSendMessage(CLIENT_ID, `Check-in requested: ${formatCheckinDate(date)} at ${formatCheckinTime(time)}`, 'client');
    toast.success(`Check-in requested for ${formatCheckinDate(date)}`);

    // Notify coach (in real app this would be server-side)
    addNotification({
      title: 'Check-in Requested',
      message: `You requested a check-in for ${formatCheckinDate(date)} at ${formatCheckinTime(time)}.`,
      link: '/portal/messages',
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    ctxSendMessage(CLIENT_ID, message, 'client');
    setMessage('');

    setTimeout(() => {
      ctxSendMessage(CLIENT_ID, 'Sounds like a great plan. Keep up the good work!', 'coach');
      addNotification({ title: 'Coach Eli', message: 'Sounds like a great plan. Keep up the good work!', link: '/portal/messages' });
    }, 3000);
  };

  return (
    <div className="w-full h-[calc(100vh-6rem)] lg:h-[calc(100vh-8rem)] flex bg-white rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 overflow-hidden">

      {/* Sidebar - Coach Info */}
      <div className="hidden lg:flex w-80 flex-col border-r border-neutral-100 bg-[#FAFAFA]">
        <div className="p-8 flex flex-col items-center border-b border-neutral-100 bg-white">
          <img src={COACH_PHOTO} alt="Coach Eli" className="w-20 h-20 rounded-2xl object-cover shadow-lg mb-4" />
          <h2 className="font-serif text-xl font-semibold text-[#121212]">Coach Eli</h2>
          <p className="text-sm text-[#C81D6B] font-medium mt-1">Lead Trainer</p>
          <p className="text-xs text-neutral-500 text-center mt-4">
            Usually responds within a few hours.
          </p>
        </div>

        <div className="p-6">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Info</h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Your coach reviews messages daily. For urgent matters, use the check-in form in your dashboard.
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-[#FAFAFA]">
        {/* Header */}
        <div className="h-20 px-6 border-b border-neutral-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <img src={COACH_PHOTO} alt="Coach Eli" className="lg:hidden w-10 h-10 rounded-xl object-cover shrink-0" />
            <div>
              <h3 className="font-semibold text-[#121212]">Chat with Coach</h3>
              <p className="text-xs text-neutral-500 font-medium">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-neutral-400">
            {pendingExists ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-400">
                <Clock size={13} />
                <span className="hidden sm:inline">Pending</span>
              </div>
            ) : (
              <button
                onClick={() => setShowCheckinPicker(!showCheckinPicker)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
                  showCheckinPicker
                    ? 'bg-[#C81D6B] text-white'
                    : 'bg-[#C81D6B]/10 text-[#C81D6B] hover:bg-[#C81D6B] hover:text-white'
                }`}
              >
                <CalendarPlus size={14} />
                <span className="hidden sm:inline">Check-in</span>
                {!showCheckinPicker && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C81D6B] opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#C81D6B]" />
                  </span>
                )}
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:text-[#121212] hover:bg-neutral-100 rounded-full transition-colors">
                  <MoreVertical size={18} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg border-neutral-100">
                <DropdownMenuItem className="gap-3 rounded-lg cursor-pointer" onClick={() => toast.info('Search in conversation — coming soon')}>
                  <SearchIcon size={15} /> Search in chat
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-3 rounded-lg cursor-pointer" onClick={() => { setIsMuted(!isMuted); toast.success(isMuted ? 'Notifications unmuted' : 'Notifications muted'); }}>
                  <BellOff size={15} className={isMuted ? 'text-[#C81D6B]' : ''} />
                  {isMuted ? 'Unmute notifications' : 'Mute notifications'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-3 rounded-lg cursor-pointer" onClick={() => toast.success('Conversation archived')}>
                  <Archive size={15} /> Archive conversation
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-3 rounded-lg cursor-pointer text-red-600 focus:text-red-600" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 size={15} /> Delete conversation
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
            className="mx-4 lg:mx-6 mt-4 px-4 py-3 bg-[#C81D6B]/5 border border-[#C81D6B]/15 rounded-2xl flex items-center gap-3"
          >
            <CalendarDays size={16} className="text-[#C81D6B] shrink-0" />
            <span className="text-sm text-[#121212] font-medium">
              Next check-in: <span className="font-semibold">{formatCheckinDate(nextCheckin.date)} at {formatCheckinTime(nextCheckin.time)}</span>
            </span>
            {nextCheckin.type === 'recurring' && (
              <span className="ml-auto text-[10px] font-bold text-[#C81D6B] uppercase tracking-widest">Weekly</span>
            )}
          </motion.div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          <div className="text-center">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-100 px-3 py-1 rounded-full">
              Today
            </span>
          </div>

          {messages.map((msg) => {
            const isClient = msg.sender === 'client';
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
                className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-end gap-2 max-w-[85%] lg:max-w-[70%]">
                  {!isClient && (
                    <img src={COACH_PHOTO} alt="" className="w-6 h-6 rounded-md object-cover shrink-0 mb-1 shadow-sm" />
                  )}
                  <div className={`p-4 rounded-2xl text-sm ${
                    isClient
                      ? 'bg-[#C81D6B] text-white rounded-br-sm shadow-md'
                      : 'bg-white border border-neutral-100 shadow-sm text-[#121212] rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-1 px-8">
                  <span className="text-[10px] text-neutral-400 font-medium">{msg.time}</span>
                  {isClient && (
                    <span className="text-neutral-400">
                      {msg.status === 'read' ? <CheckCheck size={12} className="text-blue-500" /> : <Check size={12} />}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions + Input */}
        <div className="bg-white border-t border-neutral-100 shrink-0">
          {/* Inline check-in picker */}
          <AnimatePresence>
            {showCheckinPicker && (
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
                      Request a check-in
                    </div>
                    <button onClick={() => setShowCheckinPicker(false)} className="p-1 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-600 transition-colors">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Calendar */}
                    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={{ before: new Date() }}
                        className="p-3"
                        classNames={{
                          caption: "flex justify-center pt-1 relative items-center w-full",
                          caption_label: "text-sm font-semibold text-[#121212]",
                          nav: "flex items-center gap-1",
                          nav_button: "size-8 flex items-center justify-center rounded-full border-0 bg-transparent text-neutral-500 hover:bg-neutral-100 hover:text-[#121212] transition-colors",
                          nav_button_previous: "absolute left-1",
                          nav_button_next: "absolute right-1",
                          head_cell: "text-neutral-400 rounded-md w-9 font-medium text-[11px] uppercase",
                          cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:rounded-md",
                          day: "size-9 p-0 font-normal rounded-lg hover:bg-neutral-100 transition-colors aria-selected:opacity-100",
                          day_selected: "bg-[#C81D6B] text-white hover:bg-[#C81D6B] hover:text-white focus:bg-[#C81D6B] focus:text-white",
                          day_today: "bg-neutral-100 font-semibold text-[#121212]",
                          day_disabled: "text-neutral-300 opacity-50 hover:bg-transparent",
                          day_outside: "text-neutral-300",
                          row: "flex w-full mt-1",
                        }}
                      />
                    </div>

                    {/* Time grid + submit */}
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-widest">
                        <Clock size={13} />
                        Pick a time
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {TIME_SLOTS.map(slot => (
                          <button
                            key={slot}
                            onClick={() => setSelectedTime(slot)}
                            className={`px-3 py-2.5 text-xs font-semibold rounded-xl border transition-all ${
                              selectedTime === slot
                                ? 'border-[#C81D6B] bg-[#C81D6B]/10 text-[#C81D6B]'
                                : 'border-neutral-200 bg-neutral-50 text-[#121212] hover:border-[#C81D6B] hover:text-[#C81D6B]'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleScheduleCheckin}
                        disabled={!selectedDate || !selectedTime}
                        className="mt-auto flex items-center justify-center gap-2 px-5 py-3 bg-[#C81D6B] text-white text-sm font-bold rounded-xl hover:bg-[#a31556] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
                      >
                        <CalendarPlus size={16} />
                        Request Check-in
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSend} className="flex items-end gap-3 p-4">
            <button type="button" className="h-[56px] w-[56px] flex items-center justify-center text-neutral-400 hover:text-[#121212] transition-colors rounded-2xl hover:bg-neutral-50 shrink-0">
              <Paperclip size={22} />
            </button>
            <div className="flex-1 bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#C81D6B] focus-within:ring-1 focus-within:ring-[#C81D6B] transition-all overflow-hidden shadow-sm">
              <textarea
                rows={1}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message Coach Eli..."
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
              className="h-[56px] w-[56px] flex items-center justify-center bg-[#121212] text-white rounded-2xl hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-md"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
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
              Your entire message history with <span className="font-semibold text-[#121212]">Coach Eli</span> will be permanently deleted. This cannot be undone.
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
