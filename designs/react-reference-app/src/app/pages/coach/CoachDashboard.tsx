import { motion } from 'motion/react';
import { Video, ClipboardCheck, Plus, ArrowRight, User } from 'lucide-react';
import { Link } from 'react-router';
import { useCheckins } from '../../context/CheckinContext';
import { formatCheckinDate, formatCheckinTime } from '../../utils/dateFormatters';

const MOCK_CALLS = [
  { id: 1, name: 'Emma Watson', time: '10:00 AM', type: 'Assessment Call' },
  { id: 2, name: 'Sarah Jenkins', time: '1:30 PM', type: 'Ad-hoc Check-in' },
];

// MOCK_CHECKINS removed — now pulled from CheckinContext

const MOCK_CLIENTS = [
  { id: 'c1', name: 'Jane Doe', phase: 'Luteal', goal: 'Recomp', compliance: '95%' },
  { id: 'c2', name: 'Jessica Alba', phase: 'Follicular', goal: 'Fat Loss', compliance: '88%' },
  { id: 'c3', name: 'Emma Stone', phase: 'Ovulatory', goal: 'Hypertrophy', compliance: '100%' },
];

export function CoachDashboard() {
  const { getPendingCheckins } = useCheckins();
  const pendingCheckins = getPendingCheckins();

  return (
    <div className="w-full pb-12">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="font-serif text-3xl lg:text-4xl text-foreground mb-3 tracking-tight">
            Good morning, Coach.
          </h1>
          <p className="text-muted-foreground font-medium">
            You have 2 calls and {pendingCheckins.length} check-in{pendingCheckins.length !== 1 ? 's' : ''} to review today.
          </p>
        </div>
        <Link 
          to="/coach/onboard"
          className="px-6 py-3.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg shrink-0"
        >
          <Plus size={18} strokeWidth={2.5} />
          Onboard New Client
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
        
        {/* Upcoming Calls */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Video size={20} />
            </div>
            <h2 className="font-serif text-xl text-foreground font-semibold">Upcoming Calls</h2>
          </div>
          
          <div className="space-y-4">
            {MOCK_CALLS.map(call => (
              <div key={call.id} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-muted/50 hover:bg-card hover:shadow-sm transition-all">
                <div>
                  <p className="font-semibold text-sm text-foreground">{call.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{call.time} • {call.type}</p>
                </div>
                <button className="px-4 py-2 bg-surface-inverted text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-colors">
                  Join Meet
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pending Check-ins */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#FF7A45]/10 text-[#FF7A45] flex items-center justify-center">
              <ClipboardCheck size={20} />
            </div>
            <h2 className="font-serif text-xl text-foreground font-semibold">Pending Check-ins</h2>
          </div>

          <div className="space-y-4">
            {pendingCheckins.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No pending check-ins</p>
            ) : (
              pendingCheckins.map(checkin => (
                <div key={checkin.id} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-muted/50 hover:bg-card hover:shadow-sm transition-all">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{checkin.clientName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatCheckinDate(checkin.date)} at {formatCheckinTime(checkin.time)}</p>
                  </div>
                  <Link to="/coach/checkins" className="px-4 py-2 bg-card border border-border text-foreground text-xs font-semibold rounded-lg hover:bg-muted transition-colors">
                    Review
                  </Link>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Active Clients Table */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-soft text-brand flex items-center justify-center">
              <User size={20} />
            </div>
            <h2 className="font-serif text-xl text-foreground font-semibold">Active Clients</h2>
          </div>
          <button className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            View All
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Client Name</th>
                <th className="pb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cycle Phase</th>
                <th className="pb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Primary Goal</th>
                <th className="pb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Compliance</th>
                <th className="pb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CLIENTS.map(client => (
                <tr key={client.id} className="border-b border-neutral-50 hover:bg-muted/50 transition-colors group">
                  <td className="py-4 font-semibold text-sm text-foreground">{client.name}</td>
                  <td className="py-4 text-sm text-muted-foreground">{client.phase}</td>
                  <td className="py-4 text-sm text-muted-foreground">{client.goal}</td>
                  <td className="py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-success-soft text-success text-xs font-bold">
                      {client.compliance}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <Link 
                      to={`/coach/clients/${client.id}`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border text-muted-foreground group-hover:bg-surface-inverted group-hover:text-white group-hover:border-surface-inverted transition-all"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}