import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  MessageSquare,
  Calendar,
  Activity,
  Flame,
  CalendarDays,
  History,
  Pencil,
  Plus,
  ChevronDown,
  ChevronUp,
  Droplet,
  UserCog,
  UtensilsCrossed,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTraining, type GoalType } from '../../context/TrainingContext';
import { useCheckins } from '../../context/CheckinContext';
import { useCycle } from '../../context/CycleContext';
import { useClientProfile, fullName } from '../../context/ClientProfileContext';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import { useNutrition } from '../../context/NutritionContext';
import {
  formatVolume,
  displayWeightValue,
  weightUnitLabel,
} from '../../utils/units';
import { getInitials, trainingClientIdFor } from '../../utils/clientHelpers';
import { PORTAL_PAGE_TITLE_CLASS } from '../../components/PortalPageHeader';
import { SubscriptionBadge } from '../../components/coach-portal/SubscriptionBadge';
import { JourneyClientDetails } from '../../components/coach-portal/JourneyClientDetails';
import { OnboardingPanel } from '../../components/coach-portal/OnboardingPanel';
import { SubscriptionSummary } from '../../components/SubscriptionSummary';
import { MeasurementsTable } from '../../components/MeasurementsTable';
import { GoalWidget } from '../../components/GoalWidget';
import { CyclePhaseWidget } from '../../components/CyclePhaseWidget';
import { ProfileDetailsWidget } from '../../components/ProfileDetailsWidget';
import { useMeasureUnits } from '../../components/client-portal/measureUnits';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { journeyCallIdForClient } from '../../utils/journeyLabels';
import { isBeforeStage } from '../../domain/journey';
import { useNotifications } from '../../context/NotificationContext';
import { useMessaging } from '../../context/MessagingContext';
import {
  formatCheckinDate,
  formatCheckinTime,
  toISODate,
  to24h,
} from '../../utils/dateFormatters';
import { CheckinSchedulerSheet } from '../../components/CheckinSchedulerSheet';
import { Button, buttonVariants } from '../../components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { toast } from 'sonner';
import { useAppState } from '../../context/AppContext';
import { cn } from '../../components/ui/utils';

export function ClientDetails() {
  const { id = 'client-1' } = useParams();
  const { journeyForCall } = useClientJourneys();
  const journey = journeyForCall(id);

  return journey ? (
    <JourneyClientDetails journey={journey} />
  ) : (
    <RosterClientDetails />
  );
}

function RosterClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getClientActivePlan,
    getClientPastPlans,
    getClientActiveGoal,
    getClientGoals,
    getClientActiveSubscription,
    createGoal,
    completeGoal,
    completePlanInstance,
    getClientWorkoutHistory,
    exercises,
  } = useTraining();
  const { coachInitiateCheckin, getBookedSlots } = useCheckins();
  const { getCurrentPhase, getClientProfile } = useCycle();
  const { getProfile } = useClientProfile();
  const { journeyForCall } = useClientJourneys();
  const { weightUnit, heightUnit } = useUnitPreferences();
  const measureUnits = useMeasureUnits();
  const { addNotification } = useNotifications();
  const { addSystemMessage, sendMessage: ctxSendMessage } = useMessaging();
  const { appState } = useAppState();
  const isPostMvp = appState.prototypeMode === 'post-mvp';

  const {
    getPlan: getNutritionPlan,
    getPreferences: getNutritionPreferences,
    tags: nutritionTags,
    foods: nutritionFoods,
  } = useNutrition();

  const clientId = id || 'client-1';
  // Normalize alias IDs to canonical IDs for data lookups
  const dataClientId = trainingClientIdFor(clientId);
  const profile = getProfile(clientId);
  const clientName = profile ? fullName(profile) : 'Unknown Client';
  const weightChangeKg = profile
    ? profile.currentWeightKg - profile.startingWeightKg
    : 0;

  const phase = getCurrentPhase(clientId);
  const menstrualProfile = getClientProfile(clientId);

  const activePlan = getClientActivePlan(clientId);
  const pastPlans = getClientPastPlans(clientId);
  const activeGoal = getClientActiveGoal(dataClientId);
  const allGoals = getClientGoals(dataClientId);
  const suggestedGoalType = useMemo<GoalType | undefined>(() => {
    const completedGoals = allGoals.filter(
      (goal) => goal.status === 'completed',
    );
    if (completedGoals.length === 0) return undefined;
    return [...completedGoals].sort((a, b) =>
      (b.endDate ?? '').localeCompare(a.endDate ?? ''),
    )[0].type;
  }, [allGoals]);
  const activeSubscription = getClientActiveSubscription(dataClientId);

  const journeyCallId = journeyCallIdForClient(clientId);
  const journey = journeyCallId ? journeyForCall(journeyCallId) : null;
  const showsJourney =
    journey !== null && !isBeforeStage(journey.stage, 'account-created');
  const heightCm = profile?.heightCm ?? 0;

  // Confirm dialogs
  const [showEndPlan, setShowEndPlan] = useState(false);

  // Past plans expand
  const [pastPlansExpanded, setPastPlansExpanded] = useState(false);

  // Schedule check-in dialog
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState<string | null>(null);
  const [scheduleNote, setScheduleNote] = useState('');

  const bookedSlots = useMemo(
    () => (scheduleDate ? getBookedSlots(toISODate(scheduleDate)) : []),
    [scheduleDate, getBookedSlots],
  );

  const handleEndGoal = () => {
    if (!activeGoal) return;
    completeGoal(activeGoal.id);
    toast.success('Goal completed');
  };

  const handleStartGoal = (type: GoalType) => {
    createGoal(dataClientId, type);
    toast.success(`${type} goal created`);
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
    coachInitiateCheckin({
      clientId,
      clientName,
      date,
      time,
      note: scheduleNote || undefined,
    });

    addSystemMessage(
      clientId,
      `Coach scheduled a check-in for ${formatCheckinDate(date)} at ${formatCheckinTime(time)}`,
      'checkin-scheduled',
    );
    if (scheduleNote) {
      ctxSendMessage(clientId, scheduleNote, 'coach');
    }
    toast.success(`Check-in scheduled with ${clientName}`);
    addNotification({
      title: 'Check-in Scheduled',
      message: `Coach scheduled a check-in with ${clientName} for ${formatCheckinDate(date)} at ${formatCheckinTime(time)}.`,
      link: '/portal/messages',
      mvpLink: '/portal/checkins',
    });

    setShowScheduleDialog(false);
    setScheduleDate(undefined);
    setScheduleTime(null);
    setScheduleNote('');
  };

  return (
    <div className="w-full">
      <Link
        to="/coach/clients"
        className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Clients
      </Link>

      <header className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="flex items-center gap-5 min-w-0">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="w-16 h-16 rounded-full object-cover shrink-0 border border-neutral-100"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center font-serif text-text-primary font-semibold text-xl shrink-0">
              {getInitials(clientName)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className={`${PORTAL_PAGE_TITLE_CLASS} mb-2`}>{clientName}</h1>
            <p className="text-text-secondary">
              {isPostMvp && activePlan
                ? `Active Client · Week ${activePlan.currentWeekNumber} of ${activePlan.weeks.length}`
                : 'Active Client'}
            </p>
            {activeSubscription && (
              <div className="mt-2">
                <SubscriptionBadge subscription={activeSubscription} />
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/coach/clients/${clientId}/edit`}
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            <UserCog size={16} />
            Edit Profile
          </Link>
          <Link
            to={`/coach/clients/${clientId}/cycle`}
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            <Droplet size={16} />
            Cycle Log
          </Link>
          {isPostMvp && (
            <Link
              to={`/coach/messages?client=${clientId}`}
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              <MessageSquare size={16} />
              Message
            </Link>
          )}
          <Button
            onClick={() => setShowScheduleDialog(true)}
            variant="default"
            size="lg"
          >
            <Calendar size={16} />
            Schedule Check-in
          </Button>
        </div>
      </header>

      {showsJourney && journey && (
        <>
          <OnboardingPanel
            journey={journey}
            clientId={clientId}
            heightCm={heightCm}
          />
          {journey.subscription && (
            <SubscriptionSummary
              subscription={journey.subscription}
              perspective="coach"
              headingId="subscription-panel-heading"
              className="mb-8"
            />
          )}
          <MeasurementsTable
            measurements={journey.measurements}
            heightCm={heightCm}
            units={measureUnits}
            headingId="measurements-panel-heading"
            emptyMessage="She has not sent any measurements yet."
            className="mb-8"
          />
        </>
      )}

      {/* Stats Grid */}
      <div
        className={cn('grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:gap-6', {
          'lg:grid-cols-4': isPostMvp,
        })}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col justify-between h-36"
        >
          <div className="flex justify-between items-start w-full">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              Progress
            </span>
            <Activity size={16} className="text-green-600" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-1 mt-auto">
            <span className="font-serif text-3xl text-text-primary">
              {profile
                ? `${weightChangeKg > 0 ? '+' : ''}${displayWeightValue(weightChangeKg, weightUnit, 1)}`
                : '--'}
            </span>
            <span className="text-xs font-semibold text-text-secondary">
              {weightUnitLabel(weightUnit)}
            </span>
          </div>
        </motion.div>

        {isPostMvp && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white p-6 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col justify-between h-36"
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                Daily Target
              </span>
              <Flame
                size={16}
                className="text-metric-energy"
                strokeWidth={2.5}
              />
            </div>
            <div className="flex flex-col mt-auto">
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-2xl text-text-primary">
                  {profile?.dailyCalories.toLocaleString() ?? '--'}
                </span>
                <span className="text-xs font-semibold text-text-secondary">
                  kcal
                </span>
              </div>
              {profile && (
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1">
                  {profile.proteinGrams}P / {profile.carbsGrams}C /{' '}
                  {profile.fatsGrams}F
                </p>
              )}
            </div>
          </motion.div>
        )}

        <CyclePhaseWidget
          presentation="coach"
          phase={phase}
          headingId="phase-tile-heading"
          footer={
            <Link
              to={`/coach/clients/${clientId}/cycle`}
              className="text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
            >
              View cycle log
            </Link>
          }
        />

        {isPostMvp && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white p-6 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col justify-between h-36"
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                Avg Compliance
              </span>
              <History
                size={16}
                className="text-brand-secondary"
                strokeWidth={2.5}
              />
            </div>
            <div className="flex items-baseline gap-1 mt-auto">
              <span className="font-serif text-3xl text-text-primary">95</span>
              <span className="text-xs font-semibold text-text-secondary">
                %
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Current focus section */}
      <section aria-labelledby="current-focus-heading" className="mb-8">
        <h2
          id="current-focus-heading"
          className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4"
        >
          Current focus
        </h2>
        <div
          className={cn('grid grid-cols-1 gap-6', {
            'lg:grid-cols-3': isPostMvp,
          })}
        >
          {/* Current Goal */}
          <GoalWidget
            presentation="coach"
            goal={activeGoal}
            headingId="goal-widget-heading"
            management={{
              onStart: handleStartGoal,
              onEnd: handleEndGoal,
              suggestedType: suggestedGoalType,
            }}
          />

          {/* Active Plan */}
          {isPostMvp && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white p-6 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col h-full"
            >
              <h2 className="font-serif text-lg text-text-primary font-semibold mb-4 flex items-center gap-2">
                <Activity size={18} className="text-brand" />
                Active Plan
              </h2>

              {activePlan ? (
                <div className="flex flex-col flex-1">
                  <h3 className="font-semibold text-text-primary text-base mb-2">
                    {activePlan.name}
                  </h3>

                  {/* Week progress dots */}
                  <div className="flex gap-1 mb-3">
                    {activePlan.weeks.map((week, i) => (
                      <div
                        key={week.id}
                        className={`h-2 flex-1 rounded-full ${
                          i < activePlan.currentWeekNumber - 1
                            ? 'bg-brand'
                            : i === activePlan.currentWeekNumber - 1
                              ? 'bg-brand/50'
                              : 'bg-neutral-100'
                        } ${week.isDeload ? 'ring-1 ring-blue-300' : ''}`}
                      />
                    ))}
                  </div>

                  <p className="text-xs text-text-secondary mb-4">
                    Week {activePlan.currentWeekNumber} of{' '}
                    {activePlan.weeks.length} · Started {activePlan.startDate}
                  </p>

                  <Button
                    onClick={() => setShowEndPlan(true)}
                    variant="outline"
                    className="mt-auto w-full"
                  >
                    End Plan
                  </Button>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
                    <Activity size={22} className="text-brand" />
                  </div>
                  <p className="text-sm text-text-secondary">No active plan</p>
                  <Button
                    onClick={() =>
                      navigate(`/coach/training/builder/${clientId}`)
                    }
                    variant="default"
                  >
                    <Plus size={16} /> Create Plan
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Nutrition */}
          {isPostMvp &&
            (() => {
              const nutritionPlan = getNutritionPlan(clientId);
              const activeBlock = nutritionPlan?.blocks.find(
                (b) => b.status === 'active',
              );
              const preferences = getNutritionPreferences(clientId);

              // Compute active block summary
              let blockSummary: {
                dateRange: string;
                kcalPerDay: number;
                mealCount: number;
              } | null = null;
              if (activeBlock) {
                const start = parseISO(activeBlock.startDate);
                const lastDay = activeBlock.days[activeBlock.days.length - 1];
                const end = parseISO(lastDay.date);
                const dateRange = `${format(start, 'MMM d')}–${format(end, 'MMM d')}`;
                const mealCount = activeBlock.days
                  .flatMap((d) => d.slots)
                  .filter((s) => !!s.recipeId).length;
                blockSummary = {
                  dateRange,
                  kcalPerDay: nutritionPlan!.dailyTarget.kcal,
                  mealCount,
                };
              }

              // Resolve preference chip labels
              const dietaryChips =
                preferences?.dietaryFlags.map((flagId) => {
                  const tag = nutritionTags.find((t) => t.id === flagId);
                  return tag?.label ?? flagId;
                }) ?? [];
              const allergenChips = preferences?.allergens ?? [];
              const dislikedChips =
                preferences?.dislikedFoodIds.map((foodId) => {
                  const food = nutritionFoods.find((f) => f.id === foodId);
                  return food?.name ?? foodId;
                }) ?? [];
              const allChips = [
                ...dietaryChips,
                ...allergenChips,
                ...dislikedChips,
              ];

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white p-6 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 flex flex-col h-full"
                >
                  <h2 className="font-serif text-lg text-text-primary font-semibold mb-4 flex items-center gap-2">
                    <UtensilsCrossed
                      size={18}
                      className="text-brand-secondary"
                    />
                    Nutrition
                  </h2>

                  {/* Plan summary */}
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">
                      Plan
                    </p>
                    {blockSummary ? (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-text-primary">
                          Active block · {blockSummary.dateRange}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {blockSummary.kcalPerDay.toLocaleString()} kcal/day ·{' '}
                          {blockSummary.mealCount} meals planned
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-text-secondary">
                        No nutrition plan yet
                      </p>
                    )}
                  </div>

                  {/* Food preferences */}
                  <div className="mb-5">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">
                      Food preferences
                    </p>
                    {allChips.length > 0 ? (
                      <div
                        className="flex flex-wrap gap-1.5"
                        role="list"
                        aria-label="Food preferences"
                      >
                        {dietaryChips.map((label) => (
                          <span
                            key={label}
                            role="listitem"
                            className="text-caption font-semibold px-2.5 py-1 rounded-full bg-brand-secondary/10 text-text-primary border border-brand-secondary/20"
                          >
                            {label}
                          </span>
                        ))}
                        {allergenChips.map((label) => (
                          <span
                            key={label}
                            role="listitem"
                            className="text-caption font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-text-primary border border-amber-200"
                          >
                            {label} allergy
                          </span>
                        ))}
                        {dislikedChips.map((label) => (
                          <span
                            key={label}
                            role="listitem"
                            className="text-caption font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-text-primary"
                          >
                            No {label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-text-secondary">None set</p>
                    )}
                  </div>

                  {/* Actions */}
                  <Button
                    onClick={() =>
                      navigate(`/coach/nutrition/client/${clientId}/plan`)
                    }
                    variant="default"
                    className="mt-auto w-full"
                  >
                    <UtensilsCrossed size={15} />
                    Open plan builder
                  </Button>
                </motion.div>
              );
            })()}
        </div>
      </section>

      {/* Secondary detail section */}
      <div
        className={cn('grid grid-cols-1 gap-6', {
          'lg:grid-cols-3': isPostMvp,
        })}
      >
        {/* Workout History */}
        {isPostMvp && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-white p-8 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 self-start"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl text-text-primary font-semibold">
                Workout History
              </h2>
              <Link
                to={`/coach/clients/${clientId}/history`}
                className="text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
              >
                View All ({getClientWorkoutHistory(dataClientId).length})
              </Link>
            </div>

            <div className="space-y-4">
              {getClientWorkoutHistory(dataClientId).length === 0 ? (
                <div className="text-center py-8">
                  <Activity
                    size={28}
                    className="text-neutral-300 mx-auto mb-2"
                  />
                  <p className="text-sm text-text-secondary">
                    No completed workouts yet
                  </p>
                </div>
              ) : (
                getClientWorkoutHistory(dataClientId).map((wl) => {
                  const durationMin = wl.duration
                    ? Math.round(wl.duration / 60)
                    : 0;
                  const dateStr = new Date(wl.startedAt).toLocaleDateString(
                    'en-US',
                    { month: 'short', day: 'numeric' },
                  );
                  const exerciseNames = wl.exercises
                    .map(
                      (el) =>
                        exercises.find((e) => e.id === el.exerciseId)?.name,
                    )
                    .filter(Boolean)
                    .slice(0, 2)
                    .join(', ');
                  const hasSwaps = wl.exercises.some((e) => e.wasSwapped);

                  return (
                    <Link
                      key={wl.id}
                      to={`/coach/clients/${clientId}/workout/${wl.id}`}
                      className="flex items-center justify-between p-4 rounded-card border border-neutral-100 bg-neutral-50/50 hover:border-neutral-200 hover:bg-neutral-50 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-sm text-text-primary truncate">
                            {exerciseNames}
                            {wl.exercises.length > 2
                              ? ` +${wl.exercises.length - 2}`
                              : ''}
                          </p>
                          {hasSwaps && (
                            <span className="text-[8px] bg-brand-secondary/10 text-brand-secondary rounded-full px-1.5 py-0.5 font-bold uppercase shrink-0">
                              Swap
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary">
                          {dateStr} · {durationMin} min ·{' '}
                          {formatVolume(wl.totalVolume || 0, weightUnit)}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-field text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-700 shrink-0 ml-3">
                        Completed
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* Right column: Profile Details + Past Plans */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Details */}
          <ProfileDetailsWidget
            presentation="coach"
            profile={profile}
            units={{ weightUnit, heightUnit }}
            headingId="profile-details-heading"
            footer={
              <Link
                to={`/coach/clients/${clientId}/edit`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
              >
                <Pencil size={12} /> Edit
              </Link>
            }
          >
            {menstrualProfile && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                  Cycle
                </p>
                <p className="text-sm font-semibold text-text-primary">
                  {menstrualProfile.regularity === 'regular'
                    ? 'Regular'
                    : 'Irregular'}{' '}
                  &middot; {menstrualProfile.averageCycleLength}-day cycle
                </p>
              </div>
            )}
            {menstrualProfile && menstrualProfile.conditions.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                  Conditions
                </p>
                <p className="text-sm font-semibold text-text-primary">
                  {menstrualProfile.conditions.join(', ')}
                </p>
              </div>
            )}
          </ProfileDetailsWidget>

          {/* Past Plans */}
          {isPostMvp && pastPlans.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-6 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50"
            >
              <button
                onClick={() => setPastPlansExpanded(!pastPlansExpanded)}
                className="w-full flex items-center justify-between"
              >
                <h2 className="font-serif text-lg text-text-primary font-semibold flex items-center gap-2">
                  <History size={18} className="text-text-secondary" />
                  Past Plans
                  <span className="text-xs font-medium bg-neutral-100 text-text-secondary px-2 py-0.5 rounded-full">
                    {pastPlans.length}
                  </span>
                </h2>
                {pastPlansExpanded ? (
                  <ChevronUp size={18} className="text-text-secondary" />
                ) : (
                  <ChevronDown size={18} className="text-text-secondary" />
                )}
              </button>

              <AnimatePresence>
                {pastPlansExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4 space-y-3"
                  >
                    {pastPlans.map((plan) => {
                      const goal = allGoals.find((g) => g.id === plan.goalId);
                      return (
                        <div
                          key={plan.id}
                          className="p-4 rounded-control border border-neutral-100 bg-neutral-50/50"
                        >
                          <p className="font-semibold text-sm text-text-primary mb-1">
                            {plan.name}
                          </p>
                          {goal && (
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-neutral-200 text-text-secondary px-2 py-0.5 rounded-full mb-1">
                              {goal.type}
                            </span>
                          )}
                          <p className="text-xs text-text-secondary">
                            {plan.startDate} — {plan.endDate} ·{' '}
                            {plan.weeks.length} weeks
                          </p>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* End Plan Dialog */}
      <AlertDialog open={showEndPlan} onOpenChange={setShowEndPlan}>
        <AlertDialogContent className="sm:max-w-md rounded-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-text-primary">
              End this plan?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <span className="font-semibold text-text-primary">
                "{activePlan?.name}"
              </span>{' '}
              will be marked as completed and moved to past plans.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row gap-3 mt-2">
            <AlertDialogCancel className="flex-1 rounded-control border-neutral-200 text-text-secondary hover:bg-neutral-50 font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndPlan}
              className="flex-1 rounded-control bg-red-600 text-white hover:bg-red-700 font-semibold"
            >
              End Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CheckinSchedulerSheet
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        variant="schedule"
        title={`Schedule a check-in with ${clientName}`}
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
    </div>
  );
}
