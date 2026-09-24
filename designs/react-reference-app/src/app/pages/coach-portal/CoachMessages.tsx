import { useState, useRef, useEffect, useMemo } from 'react';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { motion } from 'motion/react';
import {
  Send,
  Paperclip,
  Check,
  CheckCheck,
  MoreVertical,
  User,
  Archive,
  Trash2,
  BellOff,
  Pin,
  Flag,
  CalendarPlus,
  CalendarDays,
  Activity,
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router';
import { useNotifications } from '../../context/NotificationContext';
import { useCheckins } from '../../context/CheckinContext';
import { useMessaging } from '../../context/MessagingContext';
import {
  formatCheckinDate,
  formatCheckinTime,
  toISODate,
  to24h,
} from '../../utils/dateFormatters';
import { CheckinActionCard } from '../../components/CheckinActionCard';
import { CheckinSchedulerSheet } from '../../components/CheckinSchedulerSheet';
import { SearchField } from '../../components/SearchField';
import { Button, buttonVariants } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '../../components/ui/avatar';
import { cn } from '../../components/ui/utils';
import {
  WIDGET_TITLE_CLASS,
  WIDGET_SUBHEADING_CLASS,
} from '../../components/typography';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '../../components/ui/alert-dialog';
import { toast } from 'sonner';

export function CoachMessages() {
  const [searchParams] = useSearchParams();
  const {
    conversations,
    getMessages,
    sendMessage: ctxSendMessage,
    addSystemMessage,
  } = useMessaging();
  const initialClientId =
    searchParams.get('client') || conversations[0]?.id || 'c1';

  const [activeClient, setActiveClient] = useState(initialClientId);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotifications();
  const {
    getPendingCheckins,
    getUpcomingCheckins,
    getActionableCheckins,
    approveCheckin,
    declineCheckin,
    rescheduleCheckin,
    acceptReschedule,
    coachInitiateCheckin,
    getBookedSlots,
  } = useCheckins();

  const messages = getMessages(activeClient);
  const activeConversation = conversations.find((c) => c.id === activeClient);

  const actionableForClient = useMemo(
    () => getActionableCheckins(activeClient, 'coach'),
    [getActionableCheckins, activeClient],
  );
  const nextCheckin = useMemo(
    () => getUpcomingCheckins(activeClient)[0],
    [getUpcomingCheckins, activeClient],
  );

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
    if (showSchedulePicker && scheduleDate)
      return getBookedSlots(toISODate(scheduleDate));
    if (rescheduleTarget && rescheduleDate)
      return getBookedSlots(toISODate(rescheduleDate));
    return [];
  }, [
    showSchedulePicker,
    scheduleDate,
    rescheduleTarget,
    rescheduleDate,
    getBookedSlots,
  ]);

  const rescheduleTargetCheckin = useMemo(
    () => actionableForClient.find((c) => c.id === rescheduleTarget) ?? null,
    [actionableForClient, rescheduleTarget],
  );

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
      ctxSendMessage(
        activeClient,
        'Got it, thanks for letting me know!',
        'client',
      );
      addNotification({
        title: activeConversation?.name || 'Client',
        message: 'Got it, thanks for letting me know!',
        link: `/coach/messages?client=${activeClient}`,
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

    addSystemMessage(
      activeClient,
      `Coach scheduled a check-in for ${formatCheckinDate(date)} at ${formatCheckinTime(time)}`,
      'checkin-scheduled',
    );
    if (scheduleNote) {
      ctxSendMessage(activeClient, scheduleNote, 'coach');
    }
    toast.success(`Check-in scheduled for ${activeConversation.name}`);

    setShowSchedulePicker(false);
    setScheduleDate(undefined);
    setScheduleTime(null);
    setScheduleNote('');
  };

  const handleApprove = (checkinId: string) => {
    const checkin = actionableForClient.find((c) => c.id === checkinId);
    if (!checkin) return;
    approveCheckin(checkinId);
    addSystemMessage(
      activeClient,
      `Check-in confirmed for ${formatCheckinDate(checkin.date)} at ${formatCheckinTime(checkin.time)}`,
      'checkin-scheduled',
    );
    toast.success(`Check-in approved for ${checkin.clientName}`);
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
      activeClient,
      `Coach proposed rescheduling to ${formatCheckinDate(date)} at ${formatCheckinTime(time)}`,
      'checkin-rescheduled',
    );
    if (rescheduleMsg) {
      ctxSendMessage(activeClient, rescheduleMsg, 'coach');
    }
    toast.success('Reschedule proposed');

    setRescheduleTarget(null);
    setRescheduleDate(undefined);
    setRescheduleTime(null);
    setRescheduleMsg('');
  };

  const handleAcceptReschedule = (checkinId: string) => {
    const checkin = actionableForClient.find((c) => c.id === checkinId);
    if (!checkin) return;
    acceptReschedule(checkinId);
    addSystemMessage(
      activeClient,
      `Check-in confirmed for ${formatCheckinDate(checkin.date)} at ${formatCheckinTime(checkin.time)}`,
      'checkin-scheduled',
    );
    toast.success('Reschedule accepted');
  };

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full">
      <PortalPageHeader
        title="Messages"
        subtitle="Every conversation with your clients in one place."
      />

      <div className="flex h-[calc(100vh-17rem)] lg:h-[calc(100vh-14rem)] bg-card rounded-panel shadow-soft border border-border/50 overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-80 border-r border-border flex flex-col hidden md:flex shrink-0">
          <div className="p-6 px-3 border-b border-border rounded-field">
            <h2 className={cn(WIDGET_TITLE_CLASS, 'mb-4')}>Messages</h2>
            <SearchField
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search clients"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setActiveClient(conv.id);
                  setRescheduleTarget(null);
                  setShowSchedulePicker(false);
                }}
                className={`w-full text-left p-4 flex items-start gap-3 border-b border-border-subtle transition-colors ${
                  activeClient === conv.id
                    ? 'bg-primary-soft'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar className="size-12 border border-border">
                    {conv.avatar && (
                      <AvatarImage src={conv.avatar} alt={conv.name} />
                    )}
                    <AvatarFallback>{conv.initial}</AvatarFallback>
                  </Avatar>
                  {conv.status === 'Active' && (
                    <span className="absolute bottom-0 right-0 size-3 bg-success border-2 border-surface-base rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {conv.name}
                    </p>
                    <p className="text-xs text-text-secondary shrink-0 ml-2">
                      {conv.time}
                    </p>
                  </div>
                  <p
                    className={`text-xs truncate ${conv.unread > 0 ? 'font-medium text-text-primary' : 'text-text-secondary'}`}
                  >
                    {conv.lastMessage}
                  </p>
                </div>
                {conv.unread > 0 && (
                  <Badge variant="count" className="text-primary shrink-0">
                    {conv.unread}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col h-full bg-surface-page">
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="h-20 px-6 border-b border-border rounded-field bg-card flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <Avatar className="border border-border">
                    {activeConversation.avatar && (
                      <AvatarImage
                        src={activeConversation.avatar}
                        alt={activeConversation.name}
                      />
                    )}
                    <AvatarFallback>
                      {activeConversation.initial}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className={WIDGET_SUBHEADING_CLASS}>
                      {activeConversation.name}
                    </h3>
                    <p className="text-xs text-success font-medium">Active</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-text-secondary">
                  <Button
                    onClick={() => {
                      setShowSchedulePicker(!showSchedulePicker);
                      setRescheduleTarget(null);
                    }}
                    variant={showSchedulePicker ? 'primary' : 'outline'}
                    size="xs"
                  >
                    <CalendarPlus size={14} />
                    <span className="hidden sm:inline">Schedule</span>
                  </Button>
                  <Link
                    to={`/coach/clients/${activeConversation.id}`}
                    className={buttonVariants({
                      variant: 'ghost',
                      size: 'icon-sm',
                    })}
                    title="View Profile"
                  >
                    <User size={18} />
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreVertical size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-52 rounded-control shadow-raised border-border"
                    >
                      <DropdownMenuItem
                        className="gap-3 rounded-compact cursor-pointer"
                        onClick={() => {
                          setIsPinned(!isPinned);
                          toast.success(
                            isPinned
                              ? 'Conversation unpinned'
                              : 'Conversation pinned',
                          );
                        }}
                      >
                        <Pin
                          size={15}
                          className={isPinned ? 'text-primary' : ''}
                        />
                        {isPinned ? 'Unpin conversation' : 'Pin conversation'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-3 rounded-compact cursor-pointer"
                        onClick={() => {
                          setIsMuted(!isMuted);
                          toast.success(
                            isMuted
                              ? 'Notifications unmuted'
                              : 'Notifications muted',
                          );
                        }}
                      >
                        <BellOff
                          size={15}
                          className={isMuted ? 'text-primary' : ''}
                        />
                        {isMuted
                          ? 'Unmute notifications'
                          : 'Mute notifications'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-3 rounded-compact cursor-pointer"
                        onClick={() =>
                          toast.success('Conversation flagged for follow-up')
                        }
                      >
                        <Flag size={15} />
                        Flag for follow-up
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-3 rounded-compact cursor-pointer"
                        onClick={() => toast.success('Conversation archived')}
                      >
                        <Archive size={15} />
                        Archive conversation
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-3 rounded-compact cursor-pointer text-destructive focus:text-destructive"
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
                  className="mx-6 mt-4 px-4 py-3 bg-surface-inverted/5 border border-border rounded-card flex items-center gap-3"
                >
                  <CalendarDays
                    size={16}
                    className="text-text-primary shrink-0"
                  />
                  <span className="text-sm text-text-primary font-medium">
                    Next check-in:{' '}
                    <span className="font-medium">
                      {formatCheckinDate(nextCheckin.date)} at{' '}
                      {formatCheckinTime(nextCheckin.time)}
                    </span>
                  </span>
                  {nextCheckin.type === 'recurring' && (
                    <Badge variant="muted" className="ml-auto">
                      Weekly
                    </Badge>
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
                        <div
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-card text-xs font-medium border ${
                            msg.systemType === 'plan-update'
                              ? 'bg-brand-secondary-soft border-brand-secondary/20 text-brand-secondary'
                              : msg.systemType === 'checkin-cancelled'
                                ? 'bg-destructive/5 border-destructive/30 text-destructive'
                                : msg.systemType === 'checkin-rescheduled'
                                  ? 'bg-primary-soft border-primary/20 text-primary'
                                  : 'bg-muted border-border text-text-secondary'
                          }`}
                        >
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
                          <Avatar className="size-6 border border-border shrink-0 mb-1">
                            {activeConversation.avatar && (
                              <AvatarImage
                                src={activeConversation.avatar}
                                alt=""
                              />
                            )}
                            <AvatarFallback>
                              {activeConversation.initial}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div
                          className={`p-4 rounded-card text-sm ${
                            isCoach
                              ? 'bg-surface-inverted text-surface-inverted-foreground rounded-br-tile'
                              : 'bg-card border border-border shadow-card text-text-primary rounded-bl-tile'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>

                      <div
                        className={`flex items-center gap-1 mt-1 ${isCoach ? '' : 'pl-8'}`}
                      >
                        <span className="text-xs text-text-secondary font-medium">
                          {msg.time}
                        </span>
                        {isCoach && (
                          <span className="text-text-secondary">
                            {msg.status === 'read' ? (
                              <CheckCheck
                                size={12}
                                className="text-brand-secondary"
                              />
                            ) : (
                              <Check size={12} />
                            )}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Actionable check-in cards */}
                {actionableForClient.map((checkin) => (
                  <CheckinActionCard
                    key={checkin.id}
                    checkin={checkin}
                    role="coach"
                    onApprove={() => handleApprove(checkin.id)}
                    onDecline={() => handleDecline(checkin.id)}
                    onReschedule={() => handleReschedule(checkin.id)}
                    onAcceptReschedule={() =>
                      handleAcceptReschedule(checkin.id)
                    }
                  />
                ))}

                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="bg-card border-t border-border shrink-0">
                <form
                  onSubmit={handleSend}
                  className="flex items-end gap-3 p-4"
                >
                  <Button type="button" variant="ghost" size="icon-md">
                    <Paperclip size={22} />
                  </Button>
                  <div className="flex-1 min-h-[56px] flex items-center bg-muted rounded-card border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all overflow-hidden">
                    <textarea
                      rows={1}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full bg-transparent px-4 py-3 outline-none text-sm leading-tight resize-none max-h-32"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!message.trim()}
                    variant="primary"
                    size="icon-md"
                    className="shadow-card"
                  >
                    <Send size={20} />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
              Select a conversation to start messaging
            </div>
          )}
        </div>

        {/* Schedule a check-in with the active client */}
        <CheckinSchedulerSheet
          open={showSchedulePicker}
          onOpenChange={setShowSchedulePicker}
          variant="schedule"
          title={
            activeConversation
              ? `Schedule a check-in with ${activeConversation.name}`
              : 'Schedule a check-in'
          }
          description="Pick a date and time. The client will be notified and can confirm or propose a different slot."
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

        {/* Reschedule a check-in */}
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

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="sm:max-w-md rounded-card">
            <AlertDialogHeader>
              <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 size={24} className="text-destructive" />
              </div>
              <AlertDialogTitle className="text-center text-text-primary">
                Delete this conversation?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Your entire message history with{' '}
                <span className="font-medium text-text-primary">
                  {activeConversation?.name}
                </span>{' '}
                will be permanently deleted. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:flex-row gap-3 mt-2">
              <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  setShowDeleteDialog(false);
                  toast.success('Conversation deleted');
                }}
                className="flex-1"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
