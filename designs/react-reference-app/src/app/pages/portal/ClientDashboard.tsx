import { motion } from 'motion/react';
import { Flame, Target, Activity, Calendar, Play } from 'lucide-react';

export function ClientDashboard() {
  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      <header className="mb-10">
        <h1 className="font-serif text-3xl lg:text-4xl text-[#121212] mb-3 tracking-tight">
          Welcome back, Jane.
        </h1>
        <p className="text-neutral-500 font-medium">
          Here is your daily snapshot and current focus.
        </p>
      </header>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        
        {/* BMR Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col justify-between h-36"
        >
          <div className="flex justify-between items-start w-full">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">BMR</span>
            <Flame size={16} className="text-[#FF7A45]" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-1 mt-auto">
            <span className="font-serif text-3xl lg:text-4xl text-[#121212]">1,450</span>
            <span className="text-xs font-semibold text-neutral-400">kcal</span>
          </div>
        </motion.div>

        {/* Daily Target Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col justify-between h-36"
        >
          <div className="flex justify-between items-start w-full">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Daily Target</span>
            <Target size={16} className="text-[#121212]" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-1 mt-auto">
            <span className="font-serif text-3xl lg:text-4xl text-[#121212]">1,950</span>
            <span className="text-xs font-semibold text-neutral-400">kcal</span>
          </div>
        </motion.div>

        {/* Protein Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col justify-between h-36"
        >
          <div className="flex justify-between items-start w-full">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Protein</span>
            <div className="w-6 h-6 rounded-full bg-[#C81D6B] flex items-center justify-center">
              <Activity size={12} className="text-white" strokeWidth={3} />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-auto">
            <span className="font-serif text-3xl lg:text-4xl text-[#121212]">135</span>
            <span className="text-xs font-semibold text-neutral-400">g</span>
          </div>
        </motion.div>

        {/* Phase Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col justify-between h-36"
        >
          <div className="flex justify-between items-start w-full">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Phase</span>
            <Calendar size={16} className="text-[#121212]" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-2 mt-auto">
            <span className="font-serif text-3xl lg:text-4xl text-[#121212]">Luteal</span>
            <span className="text-xs font-semibold text-neutral-400">Day 21</span>
          </div>
        </motion.div>

      </div>

      {/* Bottom Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Focus Card - Spans 2 cols on lg */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white p-8 lg:p-10 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col items-start"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full mb-6 gap-4">
            <h2 className="font-serif text-xl lg:text-2xl text-[#121212] font-semibold">Today's Focus</h2>
            <div className="bg-[#FF7A45]/10 text-[#FF7A45] px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest self-start sm:self-auto">
              Lower Body Hypertrophy
            </div>
          </div>

          <p className="text-neutral-600 font-medium leading-relaxed mb-10 max-w-2xl">
            Today we are focusing on building glute and hamstring strength. Since you are in your luteal phase, take extra care with your warm-up and don't push to absolute failure if your energy feels low. Listen to your body.
          </p>

          <button className="mt-auto px-6 py-3.5 bg-[#121212] text-white text-sm font-semibold rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-3 shadow-md hover:shadow-lg">
            <Play size={16} className="fill-current" />
            START WORKOUT
          </button>
        </motion.div>

        {/* Profile Details Card - Spans 1 col */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-1 bg-white p-8 lg:p-10 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50"
        >
          <h2 className="font-serif text-xl text-[#121212] font-semibold mb-8">Profile Details</h2>

          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                Height & Weight
              </p>
              <p className="font-semibold text-sm text-[#121212]">
                5'5" / 145 lbs
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                Primary Goal
              </p>
              <p className="font-semibold text-sm text-[#121212]">
                Body Recomposition
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                Activity Level
              </p>
              <p className="font-semibold text-sm text-[#121212]">
                Moderately Active (3-4 days/week)
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}