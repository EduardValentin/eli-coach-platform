import { useParams, Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, MessageSquare, Calendar, Activity, Flame, CalendarDays, History } from 'lucide-react';

export function ClientDetails() {
  const { id } = useParams();
  
  // Mock data fetching based on ID
  const clientName = id === 'c1' ? 'Jane Doe' : id === 'c2' ? 'Jessica Alba' : 'Emma Stone';

  return (
    <div className="w-full pb-12">
      <Link to="/coach" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-[#121212] mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-serif text-3xl lg:text-4xl text-[#121212] mb-2 tracking-tight">
            {clientName}
          </h1>
          <p className="text-neutral-500 font-medium">
            Active Client • Week 4 of 12
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to={`/coach/messages?client=${id}`} className="px-5 py-2.5 bg-white border border-neutral-200 text-[#121212] text-sm font-semibold rounded-xl hover:bg-neutral-50 transition-colors flex items-center gap-2 shadow-sm">
            <MessageSquare size={16} />
            Message
          </Link>
          <button className="px-5 py-2.5 bg-[#121212] text-white text-sm font-semibold rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-md">
            <Calendar size={16} />
            Ad-hoc Check-in
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start w-full">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Progress</span>
            <Activity size={16} className="text-green-600" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-1 mt-auto">
            <span className="font-serif text-3xl text-[#121212]">-4.2</span>
            <span className="text-xs font-semibold text-neutral-400">lbs</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start w-full">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Daily Target</span>
            <Flame size={16} className="text-[#FF7A45]" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col mt-auto">
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-2xl text-[#121212]">1,950</span>
              <span className="text-xs font-semibold text-neutral-400">kcal</span>
            </div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">135P / 180C / 60F</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start w-full">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Current Phase</span>
            <CalendarDays size={16} className="text-[#C81D6B]" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-2 mt-auto">
            <span className="font-serif text-2xl text-[#121212]">Luteal</span>
            <span className="text-xs font-semibold text-neutral-400">Day 21</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start w-full">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Avg Adherence</span>
            <History size={16} className="text-blue-500" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-1 mt-auto">
            <span className="font-serif text-3xl text-[#121212]">95</span>
            <span className="text-xs font-semibold text-neutral-400">%</span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Profile Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-1 bg-white p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50">
          <h2 className="font-serif text-xl text-[#121212] font-semibold mb-6">Profile Details</h2>
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Starting Weight / Current</p>
              <p className="font-semibold text-sm text-[#121212]">150 lbs / 145.8 lbs</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Height / Age</p>
              <p className="font-semibold text-sm text-[#121212]">{"5'5\" / 28"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Dietary Restrictions</p>
              <p className="font-semibold text-sm text-[#121212]">Dairy-free, Gluten sensitive</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Current Goal</p>
              <p className="font-semibold text-sm text-[#121212]">Body Recomposition & Strength</p>
            </div>
          </div>
        </motion.div>

        {/* Past Training Sessions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl text-[#121212] font-semibold">Past Training Sessions</h2>
            <button className="text-sm font-semibold text-neutral-500 hover:text-[#121212] transition-colors">View Logs</button>
          </div>
          
          <div className="space-y-4">
            {[
              { date: 'Yesterday', name: 'Lower Body Hypertrophy', duration: '55 min', status: 'Completed' },
              { date: 'Oct 21', name: 'Upper Body Power', duration: '45 min', status: 'Completed' },
              { date: 'Oct 19', name: 'Full Body Accessories', duration: '40 min', status: 'Missed' }
            ].map((session, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-neutral-100 bg-neutral-50/50">
                <div>
                  <p className="font-semibold text-sm text-[#121212] mb-0.5">{session.name}</p>
                  <p className="text-xs text-neutral-500">{session.date} • {session.duration}</p>
                </div>
                <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                  session.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}