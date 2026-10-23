import { useEffect, useRef, useState } from "react";
import { Target as TargetIcon, Flame } from "lucide-react";
import { useTraining } from "../../context/TrainingContext";
import { useCycle } from "../../context/CycleContext";
import { useNutrition } from "../../context/NutritionContext";
import { measuredWeights } from "../../domain/clientProfile";
import { useUnitPreferences } from "../../context/UnitPreferencesContext";
import { useClientJourneys } from "../../context/ClientJourneyContext";
import { isBeforeStage } from "../../domain/journey";
import { useSearchParams } from "react-router";
import { PortalPageHeader } from "../../components/PortalPageHeader";
import { ProgramStatusCard } from "../../components/client-portal/ProgramStatusCard";
import { MeasurementsNudge } from "../../components/client-portal/MeasurementsNudge";
import { ReviewCallScheduler } from "../../components/client-portal/ReviewCallScheduler";
import { ClientWidget } from "../../components/client-portal/ClientWidget";
import { GoalWidget } from "../../components/GoalWidget";
import { CyclePhaseWidget } from "../../components/CyclePhaseWidget";
import { ProgressWidget } from "../../components/ProgressWidget";
import { MACRO_BAR } from "../../components/coach-portal/nutrition/nutrition-constants";
import { useAppState } from "../../context/AppContext";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../components/ui/utils";
import { WidgetLink } from "../../components/WidgetLink";
import { LABEL_CLASS, VALUE_LG_CLASS } from "../../components/typography";

export function ClientDashboard() {
  const { getClientActiveGoal } = useTraining();
  const { clientPhase } = useCycle();
  const { demoJourney } = useClientJourneys();
  const { appState } = useAppState();
  const isPostMvp = appState.prototypeMode === "post-mvp";
  const { weightUnit } = useUnitPreferences();
  const [searchParams] = useSearchParams();
  const [bookingReview, setBookingReview] = useState(false);
  const { profile } = demoJourney;
  const greeting = `Welcome back, ${profile.identity.firstName}.`;
  const { startingWeightKg, currentWeightKg } = measuredWeights(demoJourney.measurements);
  const weights =
    startingWeightKg !== null && currentWeightKg !== null
      ? { startingWeightKg, currentWeightKg }
      : null;
  const primaryGoal = profile.coaching?.primaryGoal ?? null;

  const activeGoal = getClientActiveGoal("client-1");
  const goalEmptyMessage = isBeforeStage(demoJourney.stage, "program-ready")
    ? "Eli sets your goal when your program is ready."
    : "No goal set yet.";

  const reviewRequested = searchParams.get("review") === "1";
  const reviewOpened = useRef(false);

  useEffect(() => {
    if (!reviewRequested || reviewOpened.current) return;
    reviewOpened.current = true;
    setBookingReview(true);
  }, [reviewRequested]);

  return (
    <div className="w-full" data-parity="dashboard-page">
      <div data-parity-root="ClientGreeting">
        <PortalPageHeader
          title={<span data-parity="greeting">{greeting}</span>}
          subtitle={
            <span data-parity="subtitle">
              Here is your daily snapshot and current focus.
            </span>
          }
        />
      </div>

      <ProgramStatusCard />
      <MeasurementsNudge />

      <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3">
        <ProgressWidget
          presentation="client"
          profile={weights}
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

        {isPostMvp && (
          <CyclePhaseWidget
            presentation="client"
            phase={clientPhase}
            headingId="phase-heading"
            className="h-full"
            footer={
              <WidgetLink trailing="arrow" to="/portal/cycle">
                View cycle tracker
              </WidgetLink>
            }
          />
        )}

        {isPostMvp && <DailyNutritionWidget primaryGoal={primaryGoal} />}

      </div>

      {isPostMvp && (
        <ReviewCallScheduler
          onOpenChange={setBookingReview}
          open={bookingReview}
        />
      )}
    </div>
  );
}

function DailyNutritionWidget({ primaryGoal }: { primaryGoal: string | null }) {
  const { getPlan } = useNutrition();
  const dailyTarget = getPlan("client-1")?.dailyTarget;

  const proteinG = dailyTarget?.protein ?? 0;
  const carbsG = dailyTarget?.carb ?? 0;
  const fatsG = dailyTarget?.fat ?? 0;
  const macros = [
    {
      label: "Protein",
      grams: proteinG,
      kcal: proteinG * 4,
      barClass: MACRO_BAR.protein,
    },
    {
      label: "Carbs",
      grams: carbsG,
      kcal: carbsG * 4,
      barClass: MACRO_BAR.carb,
    },
    { label: "Fats", grams: fatsG, kcal: fatsG * 9, barClass: MACRO_BAR.fat },
  ];
  const macroKcal = macros.reduce((t, m) => t + m.kcal, 0);
  const pctOf = (kcal: number) =>
    macroKcal > 0 ? Math.round((kcal / macroKcal) * 100) : 0;

  return (
      <ClientWidget
        eyebrow="Daily nutrition"
        icon={Flame}
        headingId="nutrition-heading"
        className="h-full lg:col-span-2"
      >
        {dailyTarget ? (
          <>
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4 mb-5">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <TargetIcon
                    size={13}
                    className="text-text-primary"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                  <span className={LABEL_CLASS}>Daily Target</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={cn(VALUE_LG_CLASS, "tabular-nums")}>
                    {dailyTarget.kcal.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-text-secondary">
                    kcal
                  </span>
                </div>
              </div>
            </div>

            {primaryGoal && (
              <p className="flex flex-wrap items-center gap-1.5 mb-5 text-xs text-text-secondary">
                <Badge tone="muted">{primaryGoal}</Badge>
              </p>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={LABEL_CLASS}>Macros</span>
                <span className="text-xs text-text-secondary">
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
                      <span className={cn(LABEL_CLASS, "truncate")}>
                        {m.label}
                      </span>
                    </div>
                    <p className="mt-1 text-text-primary">
                      <span className="text-xl font-medium tracking-tight tabular-nums">
                        {m.grams}
                      </span>
                      <span className="text-sm font-medium text-text-secondary">
                        g
                      </span>
                      <span className="text-xs text-text-secondary">
                        {" "}
                        · {pctOf(m.kcal)}%
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p className="text-sm text-text-secondary">
            Your coach has not built your nutrition plan yet.
          </p>
        )}
      </ClientWidget>
  );
}
