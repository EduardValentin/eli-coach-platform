import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, MessageSquare, Calendar, Activity, Flame, CalendarDays, History, Target, Pencil, Plus, X, ChevronDown, ChevronUp, Droplet, UserCog } from 'lucide-react';
import { useTraining, GoalType } from '../../context/TrainingContext';
import { useCheckins } from '../../context/CheckinContext';
import { useCycle } from '../../context/CycleContext';
import { useClientProfile, ACTIVITY_LEVEL_LABELS } from '../../context/ClientProfileContext';
import { getInitials } from '../../utils/clientHelpers';
import { useNotifications } from '../../context/NotificationContext';
import { useMessaging } from '../../context/MessagingContext';
import { formatCheckinDate, formatCheckinTime, toISODate, to24h } from '../../utils/dateFormatters';
import { DateTimePicker } from '../../components/DateTimePicker';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction
} from '../../components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '../../components/ui/dialog';
import { toast } from 'sonner';

const GOAL_TYPES: GoalType[] = ['Muscle Building', 'Fat Loss', 'Strength', 'Recomposition', 'Maintenance', 'Custom'];

export function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getClientActivePlan, getClientPastPlans, getClientActiveGoal, getClientGoals, createGoal, completeGoal, completePlanInstance, getClientWorkoutHistory, exercises } = useTraining();
  const { coachInitiateCheckin, getBookedSlots } = useCheckins();
  const { getCurrentPhase, getClientProfile } = useCycle();
  const { getProfile } = useClientProfile();
  const { addNotification } = useNotifications();
  const { addSystemMessage, sendMessage: ctxSendMessage } = useMessaging();

  const clientId = id || 'client-1';
  // Normalize alias IDs to canonical IDs for data lookups
  const dataClientId = clientId === 'c1' ? 'client-1' : clientId;
  const profile = getProfile(clientId);
  const clientName = profile?.name ?? 'Unknown Client';

  const phase = getCurrentPhase(clientId);
  const menstrualProfile = getClientProfile(clientId);

  const activePlan = getClientActivePlan(clientId);
  const pastPlans = getClientPastPlans(clientId);
  const activeGoal = getClientActiveGoal(clientId);
  const allGoals = getClientGoals(clientId);

  // Goal creation form
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalType, setNewGoalType] = useState<GoalType>('Muscle Building');

  // Confirm dialogs
  const [showEndGoal, setShowEndGoal] = useState(false);
  const [showEndPlan, setShowEndPlan] = useState(false);

  // Past plans expand
  const [pastPlansExpanded, setPastPlansExpanded] = useState(false);

  // Schedule check-in dialog
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState<string | null>(null);
  const [scheduleNote, setScheduleNote] = useState('');


  const bookedSlots = useMemo(
    () => scheduleDate ? getBookedSlots(toISODate(scheduleDate)) : [],
    [scheduleDate, getBookedSlots]
  );

  const handleCreateGoal = () => {
    if (!newGoalName.trim()) { toast.error('Enter a goal name'); return; }
    createGoal(clientId, newGoalName, newGoalType);
    toast.success(`Goal "${newGoalName}" created`);
    setNewGoalName('');
    setShowNewGoal(false);
  };

  const handleEndGoal = () => {
    if (!activeGoal) return;
    completeGoal(activeGoal.id);
    toast.success('Goal completed');
    setShowEndGoal(false);
  };

  const handleEndPlan = () => {
    if (!activePlan) return;
    completePlanInstance(activePlan.id);
    toast.success('Plan completed');
    setShowEndPlan(false);
  };

  const handleScheduleCheckin = () => {
    if (!scheduleDate || !scheduleTime) return;
    const date = toISODate(scheduleDate);
    const time = to24h(scheduleTime);
    coachInitiateCheckin({ clientId, clientName, date, time, note: scheduleNote || undefined });

    addSystemMessage(clientId, `Coach scheduled a check-in for ${formatCheckinDate(date)} at ${formatCheckinTime(time)}`, 'checkin-scheduled');
    if (scheduleNote) {
      ctxSendMessage(clientId, scheduleNote, 'coach');
    }
    toast.success(`Check-in scheduled with ${clientName}`);
    addNotification({
      title: 'Check-in Scheduled',
      message: `Coach scheduled a check-in with ${clientName} for ${formatCheckinDate(date)} at ${formatCheckinTime(time)}.`,
      link: '/portal/messages',
    });

    setShowScheduleDialog(false);
    setScheduleDate(undefined);
    setScheduleTime(null);
    setScheduleNote('');
  };

  return (
    <div className="w-full pb-12">
      <Link to="/coach/clients" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-[#121212] mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Clients
      </Link>

      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-5 min-w-0">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="w-16 h-16 rounded-full object-cover shrink-0 border border-neutral-100"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center font-serif text-[#121212] font-semibold text-xl shrink-0">
              {getInitials(clientName)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-serif text-3xl lg:text-4xl text-[#121212] mb-2 tracking-tight truncate">
              {clientName}
            </h1>
            <p className="text-neutral-500 font-medium">
              {activePlan ? `Active Client · Week ${activePlan.currentWeekNumber} of ${activePlan.weeks.length}` : 'Active Client'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={`/coach/clients/${clientId}/edit`}
            className="px-5 py-2.5 bg-white border border-neutral-200 text-[#121212] text-sm font-semibold rounded-xl hover:bg-neutral-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <UserCog size={16} />
            Edit Profile
          </Link>
          <Link to={`/coach/clients/${clientId}/cycle`} className="px-5 py-2.5 bg-white border border-neutral-200 text-[#121212] text-sm font-semibold rounded-xl hover:bg-neutral-50 transition-colors flex items-center gap-2 shadow-sm">
            <Droplet size={16} />
            Cycle Log
          </Link>
          <Link to={`/coach/messages?client=${clientId}`} className="px-5 py-2.5 bg-white border border-neutral-200 text-[#121212] text-sm font-semibold rounded-xl hover:bg-neutral-50 transition-colors flex items-center gap-2 shadow-sm">
            <MessageSquare size={16} />
            Message
          </Link>
          <button
            onClick={() => setShowScheduleDialog(true)}
            className="px-5 py-2.5 bg-[#121212] text-white text-sm font-semibold rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-md"
          >
            <Calendar size={16} />
            Schedule Check-in
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
              <span className="font-serif text-2xl text-[#121212]">{profile?.dailyCalories.toLocaleString() ?? '--'}</span>
              <span className="text-xs font-semibold text-neutral-400">kcal</span>
            </div>
            {profile && (
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                {profile.proteinGrams}P / {profile.carbsGrams}C / {profile.fatsGrams}F
              </p>
            )}
          </div>
        </motion.div>

        <Link to={`/coach/clients/${clientId}/cycle`} className="block">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col justify-between h-36 hover:border-[#C81D6B]/20 hover:shadow-md transition-all cursor-pointer">
            <div className="flex justify-between items-start w-full">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Current Phase</span>
              <Droplet size={16} className="text-[#C81D6B]" strokeWidth={2.5} />
            </div>
            <div className="mt-auto min-w-0">
              <span className="font-serif text-2xl block truncate" style={phase ? { color: phase.phaseColor } : undefined}>
                {phase?.phaseName ?? 'N/A'}
              </span>
              {phase && (
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mt-0.5">
                  Day {phase.dayInCycle}
                </span>
              )}
            </div>
          </motion.div>
        </Link>

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

        {/* Left column: Goal + Plan Management */}
        <div className="lg:col-span-1 space-y-6">
          {/* Active Goal */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50">
            <h2 className="font-serif text-lg text-[#121212] font-semibold mb-4 flex items-center gap-2">
              <Target size={18} className="text-[#00796B]" />
              Current Goal
            </h2>

            {activeGoal ? (
              <div>
                <h3 className="font-semibold text-[#121212] text-base mb-1">{activeGoal.name}</h3>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-[#00796B]/10 text-[#00796B] px-2 py-0.5 rounded-full mb-3">
                  {activeGoal.type}
                </span>
                <p className="text-xs text-neutral-500 mb-4">Started {activeGoal.startDate}</p>
                <button
                  onClick={() => setShowEndGoal(true)}
                  className="w-full py-2 text-sm font-semibold text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
                >
                  End Goal
                </button>
              </div>
            ) : (
              <div>
                {!showNewGoal ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-neutral-500 mb-3">No active goal set</p>
                    <button
                      onClick={() => setShowNewGoal(true)}
                      className="px-4 py-2 text-sm font-semibold bg-[#00796B] text-white rounded-xl hover:bg-[#005a4f] transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Plus size={16} /> Start New Goal
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newGoalName}
                      onChange={e => setNewGoalName(e.target.value)}
                      placeholder="Goal name (e.g., Hypertrophy Phase 2)"
                      className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:border-[#00796B] bg-neutral-50"
                    />
                    <select
                      value={newGoalType}
                      onChange={e => setNewGoalType(e.target.value as GoalType)}
                      className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:border-[#00796B] bg-neutral-50"
                    >
                      {GOAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={handleCreateGoal} className="flex-1 py-2 text-sm font-semibold bg-[#00796B] text-white rounded-xl hover:bg-[#005a4f]">
                        Create
                      </button>
                      <button onClick={() => setShowNewGoal(false)} className="py-2 px-3 text-sm font-semibold text-neutral-500 border border-neutral-200 rounded-xl hover:bg-neutral-50">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Active Plan */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50">
            <h2 className="font-serif text-lg text-[#121212] font-semibold mb-4 flex items-center gap-2">
              <Activity size={18} className="text-[#C81D6B]" />
              Active Plan
            </h2>

            {activePlan ? (
              <div>
                <h3 className="font-semibold text-[#121212] text-base mb-2">{activePlan.name}</h3>

                {/* Week progress dots */}
                <div className="flex gap-1 mb-3">
                  {activePlan.weeks.map((week, i) => (
                    <div
                      key={week.id}
                      className={`h-2 flex-1 rounded-full ${
                        i < activePlan.currentWeekNumber - 1
                          ? 'bg-[#C81D6B]'
                          : i === activePlan.currentWeekNumber - 1
                            ? 'bg-[#C81D6B]/50'
                            : 'bg-neutral-100'
                      } ${week.isDeload ? 'ring-1 ring-blue-300' : ''}`}
                    />
                  ))}
                </div>

                <p className="text-xs text-neutral-500 mb-4">
                  Week {activePlan.currentWeekNumber} of {activePlan.weeks.length} · Started {activePlan.startDate}
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`/coach/training/builder/${clientId}`)}
                    className="w-full py-2.5 text-sm font-semibold bg-[#121212] text-white rounded-xl hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Pencil size={16} /> Edit Plan
                  </button>
                  <button
                    onClick={() => setShowEndPlan(true)}
                    className="w-full py-2 text-sm font-semibold text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    End Plan
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-neutral-500 mb-3">No active plan</p>
                <button
                  onClick={() => navigate(`/coach/training/builder/${clientId}`)}
                  className="px-4 py-2 text-sm font-semibold bg-[#C81D6B] text-white rounded-xl hover:bg-[#a31556] transition-colors flex items-center gap-2 mx-auto"
                >
                  <Plus size={16} /> Create Plan
                </button>
              </div>
            )}
          </motion.div>

          {/* Past Plans */}
          {pastPlans.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50">
              <button
                onClick={() => setPastPlansExpanded(!pastPlansExpanded)}
                className="w-full flex items-center justify-between"
              >
                <h2 className="font-serif text-lg text-[#121212] font-semibold flex items-center gap-2">
                  <History size={18} className="text-neutral-400" />
                  Past Plans
                  <span className="text-xs font-medium bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">{pastPlans.length}</span>
                </h2>
                {pastPlansExpanded ? <ChevronUp size={18} className="text-neutral-400" /> : <ChevronDown size={18} className="text-neutral-400" />}
              </button>

              <AnimatePresence>
                {pastPlansExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4 space-y-3"
                  >
                    {pastPlans.map(plan => {
                      const goal = allGoals.find(g => g.id === plan.goalId);
                      return (
                        <div key={plan.id} className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/50">
                          <p className="font-semibold text-sm text-[#121212] mb-1">{plan.name}</p>
                          {goal && (
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full mb-1">
                              {goal.name}
                            </span>
                          )}
                          <p className="text-xs text-neutral-500">
                            {plan.startDate} — {plan.endDate} · {plan.weeks.length} weeks
                          </p>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Profile Details */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg text-[#121212] font-semibold">Profile Details</h2>
              <Link
                to={`/coach/clients/${clientId}/edit`}
                className="text-xs font-semibold text-[#C81D6B] hover:text-[#a31556] transition-colors flex items-center gap-1"
              >
                <Pencil size={12} /> Edit
              </Link>
            </div>
            <div className="space-y-4">
              {profile && (
                <>
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Starting Weight / Current</p>
                    <p className="font-semibold text-sm text-[#121212]">{profile.startingWeightDisplay} / {profile.currentWeightDisplay}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Height / Age</p>
                    <p className="font-semibold text-sm text-[#121212]">{profile.heightDisplay} / {profile.age}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Activity Level</p>
                    <p className="font-semibold text-sm text-[#121212]">{ACTIVITY_LEVEL_LABELS[profile.activityLevel]}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Dietary Restrictions</p>
                    <p className="font-semibold text-sm text-[#121212]">{profile.dietaryRestrictions || 'None'}</p>
                  </div>
                </>
              )}
              {menstrualProfile && (
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Cycle</p>
                  <p className="font-semibold text-sm text-[#121212]">
                    {menstrualProfile.regularity === 'regular' ? 'Regular' : 'Irregular'} &middot; {menstrualProfile.averageCycleLength}-day cycle
                  </p>
                </div>
              )}
              {menstrualProfile && menstrualProfile.conditions.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Conditions</p>
                  <p className="font-semibold text-sm text-[#121212]">{menstrualProfile.conditions.join(', ')}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right column: Workout History */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 self-start">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl text-[#121212] font-semibold">Workout History</h2>
            <Link
              to={`/coach/clients/${clientId}/history`}
              className="text-sm font-semibold text-[#C81D6B] hover:text-[#B0185E] transition-colors"
            >
              View All ({getClientWorkoutHistory(dataClientId).length})
            </Link>
          </div>

          <div className="space-y-4">
            {getClientWorkoutHistory(dataClientId).length === 0 ? (
              <div className="text-center py-8">
                <Activity size={28} className="text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-400">No completed workouts yet</p>
              </div>
            ) : (
              getClientWorkoutHistory(dataClientId).map(wl => {
                const durationMin = wl.duration ? Math.round(wl.duration / 60) : 0;
                const dateStr = new Date(wl.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const exerciseNames = wl.exercises
                  .map(el => exercises.find(e => e.id === el.exerciseId)?.name)
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(', ');
                const hasSwaps = wl.exercises.some(e => e.wasSwapped);

                return (
                  <Link
                    key={wl.id}
                    to={`/coach/clients/${clientId}/workout/${wl.id}`}
                    className="flex items-center justify-between p-4 rounded-2xl border border-neutral-100 bg-neutral-50/50 hover:border-neutral-200 hover:bg-neutral-50 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-sm text-[#121212] truncate">{exerciseNames}{wl.exercises.length > 2 ? ` +${wl.exercises.length - 2}` : ''}</p>
                        {hasSwaps && (
                          <span className="text-[8px] bg-[#00796B]/10 text-[#00796B] rounded-full px-1.5 py-0.5 font-bold uppercase shrink-0">Swap</span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">{dateStr} · {durationMin} min · {(wl.totalVolume || 0).toLocaleString()} kg</p>
                    </div>
                    <span className="px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-700 shrink-0 ml-3">
                      Completed
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* End Goal Dialog */}
      <AlertDialog open={showEndGoal} onOpenChange={setShowEndGoal}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-[#121212]">End this goal?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <span className="font-semibold text-[#121212]">"{activeGoal?.name}"</span> will be marked as completed. You can start a new goal afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row gap-3 mt-2">
            <AlertDialogCancel className="flex-1 rounded-xl border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndGoal} className="flex-1 rounded-xl bg-[#121212] text-white hover:bg-neutral-800 font-semibold">End Goal</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Plan Dialog */}
      <AlertDialog open={showEndPlan} onOpenChange={setShowEndPlan}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-[#121212]">End this plan?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <span className="font-semibold text-[#121212]">"{activePlan?.name}"</span> will be marked as completed and moved to past plans.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row gap-3 mt-2">
            <AlertDialogCancel className="flex-1 rounded-xl border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndPlan} className="flex-1 rounded-xl bg-red-600 text-white hover:bg-red-700 font-semibold">End Plan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule Check-in Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-[#121212] font-serif">Schedule a check-in with {clientName}</DialogTitle>
          </DialogHeader>
          <DateTimePicker
            selectedDate={scheduleDate}
            onDateChange={setScheduleDate}
            selectedTime={scheduleTime}
            onTimeChange={setScheduleTime}
            bookedSlots={bookedSlots}
            onSubmit={handleScheduleCheckin}
            submitLabel="Schedule"
            showMessageField
            message={scheduleNote}
            onMessageChange={setScheduleNote}
            messagePlaceholder="Add a note (optional)"
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}
