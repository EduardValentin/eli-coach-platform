import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Flame, Target as TargetIcon, Activity, Droplet, Play } from 'lucide-react';
import { useTraining } from '../../context/TrainingContext';
import { useCycle } from '../../context/CycleContext';
import { useClientProfile, ACTIVITY_LEVEL_LABELS } from '../../context/ClientProfileContext';
import { useNavigate, Link } from 'react-router';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function ClientDashboard() {
  const { clientActivePlan, goals } = useTraining();
  const { clientPhase } = useCycle();
  const { clientProfile } = useClientProfile();
  const navigate = useNavigate();
  const firstName = clientProfile?.name.split(' ')[0] ?? 'there';

  // Determine today's workout from the active plan
  const todayInfo = useMemo(() => {
    if (!clientActivePlan) return null;
    // Get day of week: JS Date: 0=Sun, we need 0=Mon
    const jsDay = new Date().getDay();
    const dayIdx = jsDay === 0 ? 6 : jsDay - 1; // Convert to 0=Mon
    const weekIdx = (clientActivePlan.currentWeekNumber || 1) - 1;
    const week = clientActivePlan.weeks[weekIdx];
    if (!week) return null;
    const day = week.days[dayIdx];
    if (!day) return null;
    return { day, dayIdx, weekIdx, dayName: DAY_NAMES[dayIdx], isRest: day.type === 'Rest' };
  }, [clientActivePlan]);

  const activeGoal = useMemo(() => {
    if (!clientActivePlan) return null;
    return goals.find(g => g.id === clientActivePlan.goalId) || null;
  }, [clientActivePlan, goals]);

  const handleStartWorkout = () => {
    if (!clientActivePlan || !todayInfo || todayInfo.isRest) return;
    navigate(`/portal/workout/${clientActivePlan.id}/${todayInfo.weekIdx}/${todayInfo.dayIdx}`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      <header className="mb-10">
        <h1 className="font-serif text-3xl lg:text-4xl text-[#121212] mb-3 tracking-tight">
          Welcome back, {firstName}.
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
            <span className="font-serif text-3xl lg:text-4xl text-[#121212]">{clientProfile?.bmr.toLocaleString() ?? '--'}</span>
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
            <TargetIcon size={16} className="text-[#121212]" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-1 mt-auto">
            <span className="font-serif text-3xl lg:text-4xl text-[#121212]">{clientProfile?.dailyCalories.toLocaleString() ?? '--'}</span>
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
            <span className="font-serif text-3xl lg:text-4xl text-[#121212]">{clientProfile?.proteinGrams ?? '--'}</span>
            <span className="text-xs font-semibold text-neutral-400">g</span>
          </div>
        </motion.div>

        {/* Phase Card */}
        <Link to="/portal/cycle">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col justify-between h-36 hover:border-[#C81D6B]/20 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Phase</span>
              <Droplet size={16} className="text-[#C81D6B]" strokeWidth={2.5} />
            </div>
            <div className="mt-auto min-w-0">
              <span className="font-serif text-3xl lg:text-4xl text-[#121212] block truncate">{clientPhase?.phaseName ?? 'N/A'}</span>
              {clientPhase && (
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mt-0.5">
                  Day {clientPhase.dayInCycle}
                </span>
              )}
            </div>
          </motion.div>
        </Link>

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full mb-4 gap-4">
            <h2 className="font-serif text-xl lg:text-2xl text-[#121212] font-semibold">Today's Focus</h2>
            {todayInfo && !todayInfo.isRest && (
              <div className="bg-[#FF7A45]/10 text-[#FF7A45] px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest self-start sm:self-auto">
                {todayInfo.dayName} &middot; {todayInfo.day.type}
              </div>
            )}
            {todayInfo?.isRest && (
              <div className="bg-neutral-100 text-neutral-500 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest self-start sm:self-auto">
                Rest Day
              </div>
            )}
          </div>

          {activeGoal && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#00796B]/10 text-[#00796B] rounded-lg text-[11px] font-semibold mb-4">
              <TargetIcon size={12} />
              {activeGoal.name}
            </div>
          )}

          {todayInfo?.isRest ? (
            <p className="text-neutral-600 font-medium leading-relaxed mb-10 max-w-2xl">
              Today is a rest day. Focus on recovery, sleep, and nutrition. Your body builds muscle during rest, not just in the gym.
            </p>
          ) : (
            <p className="text-neutral-600 font-medium leading-relaxed mb-10 max-w-2xl">
              {todayInfo
                ? `Today's ${todayInfo.day.type.toLowerCase()} session has ${todayInfo.day.exercises.length} exercises planned. Since you are in your luteal phase, take extra care with your warm-up and listen to your body.`
                : 'No active plan assigned yet. Your coach will set one up soon!'
              }
            </p>
          )}

          {todayInfo && !todayInfo.isRest ? (
            <button
              onClick={handleStartWorkout}
              className="mt-auto px-6 py-3.5 bg-[#121212] text-white text-sm font-semibold rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-3 shadow-md hover:shadow-lg"
            >
              <Play size={16} className="fill-current" />
              START WORKOUT
            </button>
          ) : todayInfo?.isRest ? (
            <div className="mt-auto px-6 py-3.5 bg-neutral-100 text-neutral-500 text-sm font-semibold rounded-xl flex items-center gap-3">
              <Activity size={16} />
              Enjoy your rest day
            </div>
          ) : null}
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
                {clientProfile ? `${clientProfile.heightDisplay} / ${clientProfile.currentWeightDisplay}` : '--'}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                Primary Goal
              </p>
              <p className="font-semibold text-sm text-[#121212]">
                {clientProfile?.primaryGoal ?? '--'}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                Activity Level
              </p>
              <p className="font-semibold text-sm text-[#121212]">
                {clientProfile ? ACTIVITY_LEVEL_LABELS[clientProfile.activityLevel] : '--'}
              </p>
            </div>
          </div>

          <Link
            to="/portal/profile"
            className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#C81D6B] hover:text-[#a31556] transition-colors"
          >
            View full profile &rarr;
          </Link>
        </motion.div>

      </div>
    </div>
  );
}