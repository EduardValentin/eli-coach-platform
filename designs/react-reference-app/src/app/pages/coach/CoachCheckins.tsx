import { motion } from 'motion/react';
import { CalendarDays, CalendarPlus, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useCheckins, type CheckIn } from '../../context/CheckinContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatCheckinDate, formatCheckinTime } from '../../utils/dateFormatters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-[#121212]">{checkin.clientName}</p>
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
            checkin.type === 'ad-hoc'
              ? 'bg-[#FF7A45]/10 text-[#FF7A45]'
              : 'bg-neutral-100 text-neutral-500'
          }`}>
            {checkin.type}
          </span>
        </div>
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
        {checkin.note && (
          <p className="text-xs text-neutral-500 italic mt-2">"{checkin.note}"</p>
        )}
        {checkin.planId && (
          <p className="text-[10px] text-neutral-400 mt-1.5">Linked to training plan</p>
        )}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </motion.div>
  );
}

export function CoachCheckins() {
  const { checkins, getPendingCheckins, getUpcomingCheckins, approveCheckin, declineCheckin } = useCheckins();
  const { addNotification } = useNotifications();

  const pending = getPendingCheckins();
  const upcoming = getUpcomingCheckins();
  const past = checkins.filter(c => c.status === 'completed' || c.status === 'declined');

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
              <CheckinCard
                key={c.id}
                checkin={c}
                actions={
                  <>
                    <button
                      onClick={() => {
                        approveCheckin(c.id);
                        toast.success(`Approved check-in for ${c.clientName}`);
                        addNotification({
                          title: 'Check-in Approved',
                          message: `${c.clientName}'s check-in on ${formatCheckinDate(c.date)} has been confirmed.`,
                          link: '/coach/checkins',
                        });
                      }}
                      className="px-4 py-2 bg-[#121212] text-white text-xs font-semibold rounded-xl hover:bg-neutral-800 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => { declineCheckin(c.id); toast.success('Check-in declined'); }}
                      className="px-4 py-2 bg-white border border-neutral-200 text-neutral-600 text-xs font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      Decline
                    </button>
                  </>
                }
              />
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
                    c.status === 'completed' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {c.status === 'completed' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {c.status === 'completed' ? 'Completed' : 'Declined'}
                  </span>
                }
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
