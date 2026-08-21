import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Flame, Target as TargetIcon, Activity, Droplet, Play, Utensils } from 'lucide-react';
import { useTraining } from '../../context/TrainingContext';
import { useCycle } from '../../context/CycleContext';
import { useClientProfile, ACTIVITY_LEVEL_LABELS } from '../../context/ClientProfileContext';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import { formatHeight, formatBodyWeight } from '../../utils/units';
import { useNavigate, Link } from 'react-router';
import { MACRO_BAR } from '../../components/coach-portal/nutrition/nutrition-constants';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function ClientDashboard() {
  const { clientActivePlan, goals, activeWorkout } = useTraining();
  const { clientPhase } = useCycle();
  const { clientProfile } = useClientProfile();
  const { weightUnit, heightUnit } = useUnitPreferences();
  const navigate = useNavigate();
  const firstName = clientProfile?.name.split(' ')[0] ?? 'there';

  // Macro split for the nutrition card (protein/carbs 4 kcal/g, fats 9 kcal/g)
  const proteinG = clientProfile?.proteinGrams ?? 0;
  const carbsG = clientProfile?.carbsGrams ?? 0;
  const fatsG = clientProfile?.fatsGrams ?? 0;
  const macros = [
    { label: 'Protein', grams: proteinG, kcal: proteinG * 4, barClass: MACRO_BAR.protein },
    { label: 'Carbs', grams: carbsG, kcal: carbsG * 4, barClass: MACRO_BAR.carb },
    { label: 'Fats', grams: fatsG, kcal: fatsG * 9, barClass: MACRO_BAR.fat },
  ];
  const macroKcal = macros.reduce((t, m) => t + m.kcal, 0);
  const pctOf = (kcal: number) => (macroKcal > 0 ? Math.round((kcal / macroKcal) * 100) : 0);

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

  const hasActiveSession = Boolean(activeWorkout && activeWorkout.status === 'in-progress');
  const showStartCTA = Boolean(todayInfo && !todayInfo.isRest && !hasActiveSession);

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

      {/* Top Metrics Grid: unified nutrition card + cycle phase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">

        {/* Daily Nutrition Card — BMR, Daily Target + macro split */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          aria-labelledby="nutrition-heading"
          className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50"
        >
          <div className="flex items-center justify-between gap-2 mb-5">
            <h2 id="nutrition-heading" className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Daily Nutrition</h2>
            <span className="w-8 h-8 rounded-full bg-[#95134F]/10 flex items-center justify-center shrink-0">
              <Utensils size={16} className="text-[#95134F]" strokeWidth={2.5} aria-hidden="true" />
            </span>
          </div>

          {/* Headline calorie figures: BMR · Maintenance · Daily Target */}
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4 mb-5">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Flame size={13} className="text-[#803a1e]" strokeWidth={2.5} aria-hidden="true" />
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">BMR</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-3xl lg:text-4xl text-[#121212]">{clientProfile?.bmr.toLocaleString() ?? '--'}</span>
                <span className="text-xs font-semibold text-neutral-400">kcal</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Activity size={13} className="text-neutral-400" strokeWidth={2.5} aria-hidden="true" />
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Maintenance</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-3xl lg:text-4xl text-[#121212]">{clientProfile?.maintenanceCalories.toLocaleString() ?? '--'}</span>
                <span className="text-xs font-semibold text-neutral-400">kcal</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <TargetIcon size={13} className="text-[#121212]" strokeWidth={2.5} aria-hidden="true" />
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Daily Target</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-3xl lg:text-4xl text-[#121212]">{clientProfile?.dailyCalories.toLocaleString() ?? '--'}</span>
                <span className="text-xs font-semibold text-neutral-400">kcal</span>
              </div>
            </div>
          </div>

          {/* Goal / deficit note */}
          {clientProfile && (() => {
            const delta = clientProfile.dailyCalories - clientProfile.maintenanceCalories;
            const deltaLabel =
              delta === 0
                ? 'at maintenance'
                : delta < 0
                ? `−${Math.abs(delta).toLocaleString()} kcal/day deficit`
                : `+${delta.toLocaleString()} kcal/day surplus`;
            return (
              <p className="flex flex-wrap items-center gap-1.5 mb-5 text-[11px] font-medium text-neutral-400">
                <span className="inline-block px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-500 font-bold uppercase tracking-wide text-[10px]">
                  {clientProfile.primaryGoal}
                </span>
                <span>{deltaLabel}</span>
              </p>
            );
          })()}

          {/* Macro split */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Macros</span>
              <span className="text-[11px] font-medium text-neutral-400">{macroKcal.toLocaleString()} kcal</span>
            </div>
            <div className="flex h-2.5 w-full gap-1 mb-3" aria-hidden="true">
              {macros.map(m => (
                <span
                  key={m.label}
                  className={`rounded-full ${m.barClass}`}
                  style={{ width: `${macroKcal > 0 ? (m.kcal / macroKcal) * 100 : 0}%` }}
                />
              ))}
            </div>
            <ul className="grid grid-cols-3 gap-3">
              {macros.map(m => (
                <li key={m.label} className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${m.barClass}`} aria-hidden="true" />
                    <span className="text-[10px] sm:text-[11px] font-bold text-neutral-500 uppercase tracking-wide truncate">{m.label}</span>
                  </div>
                  <p className="mt-1 text-[#121212]">
                    <span className="font-serif text-lg lg:text-xl">{m.grams}</span>
                    <span className="text-xs font-semibold text-neutral-400">g</span>
                    <span className="text-[11px] font-medium text-neutral-400"> · {pctOf(m.kcal)}%</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        {/* Phase Card (kept separate) */}
        <Link to="/portal/cycle" className="lg:col-span-1 block h-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="h-full bg-white p-5 sm:p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 hover:border-[#95134F]/20 hover:shadow-md transition-all cursor-pointer flex flex-col"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Phase</span>
              <span className="w-8 h-8 rounded-full bg-[#95134F]/10 flex items-center justify-center shrink-0">
                <Droplet size={16} className="text-[#95134F]" strokeWidth={2.5} aria-hidden="true" />
              </span>
            </div>
            <div className="min-w-0 mt-auto pt-4">
              <span className="font-serif text-3xl lg:text-4xl text-[#121212] block truncate">{clientPhase?.phaseName ?? 'N/A'}</span>
              {clientPhase && (
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest block mt-0.5">
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
              <div className="bg-[#803a1e]/10 text-[#803a1e] px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest self-start sm:self-auto">
                {todayInfo.dayName} &middot; {todayInfo.day.type}
              </div>
            )}
            {todayInfo?.isRest && (
              <div className="bg-neutral-100 text-neutral-500 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest self-start sm:self-auto">
                Rest Day
              </div>
            )}
          </div>

          {activeGoal && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#005950]/10 text-[#005950] rounded-lg text-[11px] font-semibold mb-4">
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

          {todayInfo?.isRest && (
            <div className="mt-auto px-6 py-3.5 bg-neutral-100 text-neutral-500 text-sm font-semibold rounded-xl flex items-center gap-3">
              <Activity size={16} />
              Enjoy your rest day
            </div>
          )}
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
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">
                Height & Weight
              </p>
              <p className="font-semibold text-sm text-[#121212]">
                {clientProfile ? `${formatHeight(clientProfile.heightCm, heightUnit)} / ${formatBodyWeight(clientProfile.currentWeightKg, weightUnit)}` : '--'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">
                Primary Goal
              </p>
              <p className="font-semibold text-sm text-[#121212]">
                {clientProfile?.primaryGoal ?? '--'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">
                Activity Level
              </p>
              <p className="font-semibold text-sm text-[#121212]">
                {clientProfile ? ACTIVITY_LEVEL_LABELS[clientProfile.activityLevel] : '--'}
              </p>
            </div>
          </div>

          <Link
            to="/portal/profile"
            className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#95134F] hover:text-[#920047] transition-colors"
          >
            View full profile &rarr;
          </Link>
        </motion.div>

      </div>

      {showStartCTA && (
        <div className="mt-8 flex justify-center sm:justify-start">
          <button
            type="button"
            onClick={handleStartWorkout}
            className="inline-flex items-center gap-2 text-base font-semibold text-white bg-[#95134F] hover:bg-[#920047] px-6 min-h-12 rounded-2xl shadow-sm hover:shadow transition-all"
          >
            Start today's workout
            <Play size={16} className="fill-current" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}