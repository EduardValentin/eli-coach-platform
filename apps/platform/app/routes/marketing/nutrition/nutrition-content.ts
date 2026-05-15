export type CycleNutritionPhaseId =
  | "follicular"
  | "luteal"
  | "menstrual"
  | "ovulatory";

export type CycleNutritionPhase = {
  cue: string;
  day: number;
  daysLabel: string;
  id: CycleNutritionPhaseId;
  rangeEnd: number;
  rangeStart: number;
  title: string;
  tokenVariableName: string;
};

export type CycleNutritionDay = {
  cue: string;
  day: number;
  daysLabel: string;
  phase: CycleNutritionPhaseId;
  phaseTitle: string;
  tokenVariableName: string;
};

const CYCLE_NUTRITION_DAY_COUNT = 28;
export const CYCLE_NUTRITION_PROTOTYPE_START_DAY = 25;

export const cycleNutritionPhaseMilestones = [
  {
    id: "menstrual",
    title: "Menstrual",
    day: 1,
    daysLabel: "Days 1-5",
    cue: "Warm, easy-to-digest foods. A bit more iron.",
    rangeStart: 1,
    rangeEnd: 5,
    tokenVariableName: "--color-cycle-menstrual",
  },
  {
    id: "follicular",
    title: "Follicular",
    day: 6,
    daysLabel: "Days 6-13",
    cue: "Lighter, fresher meals as your energy comes back.",
    rangeStart: 6,
    rangeEnd: 13,
    tokenVariableName: "--color-cycle-follicular",
  },
  {
    id: "ovulatory",
    title: "Ovulatory",
    day: 14,
    daysLabel: "Days 14-16",
    cue: "Raw veggies, fiber-forward, lighter portions.",
    rangeStart: 14,
    rangeEnd: 16,
    tokenVariableName: "--color-cycle-ovulatory",
  },
  {
    id: "luteal",
    title: "Luteal",
    day: 17,
    daysLabel: "Days 17-28",
    cue: "A few more complex carbs and root veggies to support the wind-down.",
    rangeStart: 17,
    rangeEnd: 28,
    tokenVariableName: "--color-cycle-luteal",
  },
] as const satisfies readonly CycleNutritionPhase[];

export const cycleNutritionDays = Array.from(
  { length: CYCLE_NUTRITION_DAY_COUNT },
  (_, index) => {
    const day = index + 1;
    const phase = getCycleNutritionPhaseForDay(day);

    return {
      cue: phase.cue,
      day,
      daysLabel: phase.daysLabel,
      phase: phase.id,
      phaseTitle: phase.title,
      tokenVariableName: phase.tokenVariableName,
    };
  },
) satisfies CycleNutritionDay[];

export function getCycleNutritionDayForProgress(progress: number): CycleNutritionDay {
  const daysAdvanced = Math.floor(
    clampCycleNutritionProgress(progress) * CYCLE_NUTRITION_DAY_COUNT,
  );
  const dayIndex =
    (CYCLE_NUTRITION_PROTOTYPE_START_DAY - 1 + daysAdvanced) %
    CYCLE_NUTRITION_DAY_COUNT;

  return cycleNutritionDays[dayIndex] ?? getFirstCycleNutritionDay();
}

export function getCycleNutritionMilestoneForProgress(progress: number): CycleNutritionPhase {
  const milestoneIndex = Math.min(
    Math.floor(clampCycleNutritionProgress(progress) * cycleNutritionPhaseMilestones.length),
    cycleNutritionPhaseMilestones.length - 1,
  );

  return cycleNutritionPhaseMilestones[milestoneIndex] ?? getFirstCycleNutritionMilestone();
}

function getCycleNutritionPhaseForDay(day: number): CycleNutritionPhase {
  return (
    cycleNutritionPhaseMilestones.find(
      (phase) => day >= phase.rangeStart && day <= phase.rangeEnd,
    ) ?? getLastCycleNutritionMilestone()
  );
}

function clampCycleNutritionProgress(progress: number) {
  return Math.min(Math.max(progress, 0), 1);
}

function getFirstCycleNutritionDay() {
  const firstDay = cycleNutritionDays[0];

  if (!firstDay) {
    throw new Error("Cycle nutrition days must include day 1.");
  }

  return firstDay;
}

function getFirstCycleNutritionMilestone() {
  const firstMilestone = cycleNutritionPhaseMilestones[0];

  if (!firstMilestone) {
    throw new Error("Cycle nutrition milestones must include day 1.");
  }

  return firstMilestone;
}

function getLastCycleNutritionMilestone() {
  const lastMilestone = cycleNutritionPhaseMilestones[cycleNutritionPhaseMilestones.length - 1];

  if (!lastMilestone) {
    throw new Error("Cycle nutrition milestones must include at least one phase.");
  }

  return lastMilestone;
}
