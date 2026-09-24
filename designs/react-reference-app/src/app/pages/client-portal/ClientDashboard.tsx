import { useEffect, useMemo, useRef, useState } from 'react';
import { Target as TargetIcon, Activity, Flame, Play } from 'lucide-react';
import { useTraining } from '../../context/TrainingContext';
import { useCycle } from '../../context/CycleContext';
import { useClientProfile } from '../../context/ClientProfileContext';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { isBeforeStage } from '../../domain/journey';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { ProgramStatusCard } from '../../components/client-portal/ProgramStatusCard';
import { ReviewCallScheduler } from '../../components/client-portal/ReviewCallScheduler';
import { ClientWidget } from '../../components/client-portal/ClientWidget';
import { GoalWidget } from '../../components/GoalWidget';
import { CyclePhaseWidget } from '../../components/CyclePhaseWidget';
import { ProfileDetailsWidget } from '../../components/ProfileDetailsWidget';
import { ProgressWidget } from '../../components/ProgressWidget';
import { MACRO_BAR } from '../../components/coach-portal/nutrition/nutrition-constants';
import { useAppState } from '../../context/AppContext';
import { Button } from '../../components/ui/button';

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function ClientDashboard() {
  const { clientActivePlan, getClientActiveGoal, activeWorkout } =
    useTraining();
  const { clientPhase } = useCycle();
  const { clientProfile } = useClientProfile();
  const { demoJourney } = useClientJourneys();
  const { appState } = useAppState();
  const isPostMvp = appState.prototypeMode === 'post-mvp';
  const { weightUnit, heightUnit } = useUnitPreferences();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bookingReview, setBookingReview] = useState(false);
  const firstName = clientProfile?.firstName ?? 'there';

  // Macro split for the nutrition card (protein/carbs 4 kcal/g, fats 9 kcal/g)
  const proteinG = clientProfile?.proteinGrams ?? 0;
  const carbsG = clientProfile?.carbsGrams ?? 0;
  const fatsG = clientProfile?.fatsGrams ?? 0;
  const macros = [
    {
      label: 'Protein',
      grams: proteinG,
      kcal: proteinG * 4,
      barClass: MACRO_BAR.protein,
    },
    {
      label: 'Carbs',
      grams: carbsG,
      kcal: carbsG * 4,
      barClass: MACRO_BAR.carb,
    },
    { label: 'Fats', grams: fatsG, kcal: fatsG * 9, barClass: MACRO_BAR.fat },
  ];
  const macroKcal = macros.reduce((t, m) => t + m.kcal, 0);
  const pctOf = (kcal: number) =>
    macroKcal > 0 ? Math.round((kcal / macroKcal) * 100) : 0;

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
    return {
      day,
      dayIdx,
      weekIdx,
      dayName: DAY_NAMES[dayIdx],
      isRest: day.type === 'Rest',
    };
  }, [clientActivePlan]);

  const activeGoal = getClientActiveGoal('client-1');
  const goalEmptyMessage = isBeforeStage(demoJourney.stage, 'program-ready')
    ? 'Eli sets your goal when your program is ready.'
    : 'No goal set yet.';

  const handleStartWorkout = () => {
    if (!clientActivePlan || !todayInfo || todayInfo.isRest) return;
    navigate(
      `/portal/workout/${clientActivePlan.id}/${todayInfo.weekIdx}/${todayInfo.dayIdx}`,
    );
  };

  const reviewRequested = searchParams.get('review') === '1';
  const reviewOpened = useRef(false);

  useEffect(() => {
    if (!reviewRequested || reviewOpened.current) return;
    reviewOpened.current = true;
    setBookingReview(true);
  }, [reviewRequested]);

  const hasActiveSession = Boolean(
    activeWorkout && activeWorkout.status === 'in-progress',
  );
  const showStartCTA = Boolean(
    todayInfo && !todayInfo.isRest && !hasActiveSession,
  );

  return (
    <div className="w-full max-w-5xl mx-auto">
      <PortalPageHeader
        title={`Welcome back, ${firstName}.`}
        subtitle="Here is your daily snapshot and current focus."
      />

      <ProgramStatusCard />

      <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3">
        <ProgressWidget
          presentation="client"
          profile={clientProfile}
          weightUnit={weightUnit}
          headingId="progress-heading"
          className="h-full"
        />

        <GoalWidget
          presentation="client"
          goal={activeGoal}
          headingId="goal-heading"
          emptyMessage={goalEmptyMessage}
          className="h-full"
        />

        <CyclePhaseWidget
          presentation="client"
          phase={clientPhase}
          headingId="phase-heading"
          className="h-full"
          footer={
            <Link
              to="/portal/cycle"
              className="text-sm font-medium text-primary hover:underline"
            >
              View cycle tracker &rarr;
            </Link>
          }
        />

        {isPostMvp && (
          <ClientWidget
            eyebrow="Daily nutrition"
            icon={
              <Flame
                aria-hidden="true"
                className="text-brand-secondary"
                size={18}
              />
            }
            headingId="nutrition-heading"
            className="h-full lg:col-span-2"
          >
            {/* Headline calorie figures: BMR · Maintenance · Daily Target */}
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4 mb-5">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Flame
                    size={13}
                    className="text-metric-energy"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                  <span className="text-caption font-bold text-text-secondary uppercase tracking-widest">
                    BMR
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-semibold text-3xl lg:text-4xl text-text-primary">
                    {clientProfile?.bmr.toLocaleString() ?? '--'}
                  </span>
                  <span className="text-xs font-semibold text-text-secondary">
                    kcal
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity
                    size={13}
                    className="text-text-secondary"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                  <span className="text-caption font-bold text-text-secondary uppercase tracking-widest">
                    Maintenance
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-semibold text-3xl lg:text-4xl text-text-primary">
                    {clientProfile?.maintenanceCalories.toLocaleString() ??
                      '--'}
                  </span>
                  <span className="text-xs font-semibold text-text-secondary">
                    kcal
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <TargetIcon
                    size={13}
                    className="text-text-primary"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                  <span className="text-caption font-bold text-text-secondary uppercase tracking-widest">
                    Daily Target
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-semibold text-3xl lg:text-4xl text-text-primary">
                    {clientProfile?.dailyCalories.toLocaleString() ?? '--'}
                  </span>
                  <span className="text-xs font-semibold text-text-secondary">
                    kcal
                  </span>
                </div>
              </div>
            </div>

            {/* Goal / deficit note */}
            {clientProfile &&
              (() => {
                const delta =
                  clientProfile.dailyCalories -
                  clientProfile.maintenanceCalories;
                const deltaLabel =
                  delta === 0
                    ? 'at maintenance'
                    : delta < 0
                      ? `−${Math.abs(delta).toLocaleString()} kcal/day deficit`
                      : `+${delta.toLocaleString()} kcal/day surplus`;
                return (
                  <p className="flex flex-wrap items-center gap-1.5 mb-5 text-caption font-medium text-text-secondary">
                    <span className="inline-block px-2 py-0.5 rounded-field bg-neutral-100 text-text-secondary font-bold uppercase tracking-wide text-[10px]">
                      {clientProfile.primaryGoal}
                    </span>
                    <span>{deltaLabel}</span>
                  </p>
                );
              })()}

            {/* Macro split */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-caption font-bold text-text-secondary uppercase tracking-widest">
                  Macros
                </span>
                <span className="text-caption font-medium text-text-secondary">
                  {macroKcal.toLocaleString()} kcal
                </span>
              </div>
              <div className="flex h-2.5 w-full gap-1 mb-3" aria-hidden="true">
                {macros.map((m) => (
                  <span
                    key={m.label}
                    className={`rounded-full ${m.barClass}`}
                    style={{
                      width: `${macroKcal > 0 ? (m.kcal / macroKcal) * 100 : 0}%`,
                    }}
                  />
                ))}
              </div>
              <ul className="grid grid-cols-3 gap-3">
                {macros.map((m) => (
                  <li key={m.label} className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${m.barClass}`}
                        aria-hidden="true"
                      />
                      <span className="text-[10px] sm:text-caption font-bold text-text-secondary uppercase tracking-wide truncate">
                        {m.label}
                      </span>
                    </div>
                    <p className="mt-1 text-text-primary">
                      <span className="font-semibold text-lg lg:text-xl">
                        {m.grams}
                      </span>
                      <span className="text-xs font-semibold text-text-secondary">
                        g
                      </span>
                      <span className="text-caption font-medium text-text-secondary">
                        {' '}
                        · {pctOf(m.kcal)}%
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </ClientWidget>
        )}

        {isPostMvp && (
          <ClientWidget
            eyebrow="Today's focus"
            icon={
              <Activity
                aria-hidden="true"
                className="text-brand-secondary"
                size={18}
              />
            }
            headingId="focus-heading"
            className="h-full lg:col-span-2"
            action={
              todayInfo && !todayInfo.isRest ? (
                <div className="shrink-0 rounded-field bg-metric-energy-soft px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-metric-energy">
                  {todayInfo.dayName} &middot; {todayInfo.day.type}
                </div>
              ) : todayInfo?.isRest ? (
                <div className="shrink-0 rounded-field bg-neutral-100 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-text-secondary">
                  Rest Day
                </div>
              ) : null
            }
          >
            {activeGoal && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-secondary/10 text-brand-secondary rounded-compact text-caption font-semibold mb-4">
                <TargetIcon size={12} />
                {activeGoal.type}
              </div>
            )}

            {todayInfo?.isRest ? (
              <p className="text-text-secondary font-medium leading-relaxed mb-10 max-w-2xl">
                Today is a rest day. Focus on recovery, sleep, and nutrition.
                Your body builds muscle during rest, not just in the gym.
              </p>
            ) : (
              <p className="text-text-secondary font-medium leading-relaxed mb-10 max-w-2xl">
                {todayInfo
                  ? `Today's ${todayInfo.day.type.toLowerCase()} session has ${todayInfo.day.exercises.length} exercises planned. Since you are in your luteal phase, take extra care with your warm-up and listen to your body.`
                  : 'No active plan assigned yet. Your coach will set one up soon!'}
              </p>
            )}

            {todayInfo?.isRest && (
              <div className="mt-auto px-6 py-3.5 bg-neutral-100 text-text-secondary text-sm font-semibold rounded-control flex items-center gap-3">
                <Activity size={16} />
                Enjoy your rest day
              </div>
            )}
          </ClientWidget>
        )}

        {/* Profile Details Card - Spans 1 col */}
        <ProfileDetailsWidget
          presentation="client"
          profile={clientProfile}
          units={{ weightUnit, heightUnit }}
          headingId="profile-details-heading"
          className="h-full"
          footer={
            <Link
              to="/portal/profile"
              className="text-sm font-medium text-primary hover:underline"
            >
              View full profile &rarr;
            </Link>
          }
        />
      </div>

      {isPostMvp && (
        <ReviewCallScheduler
          onOpenChange={setBookingReview}
          open={bookingReview}
        />
      )}

      {isPostMvp && showStartCTA && (
        <div className="mt-8 flex justify-center sm:justify-start">
          <Button
            type="button"
            onClick={handleStartWorkout}
            variant="default"
            size="lg"
            className="shadow-sm hover:shadow"
          >
            Start today's workout
            <Play size={16} className="fill-current" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
