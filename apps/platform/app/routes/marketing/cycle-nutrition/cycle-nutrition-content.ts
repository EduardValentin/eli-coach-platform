export type CycleNutritionPhaseId = "menstrual" | "follicular" | "ovulatory" | "luteal";

export type CycleNutritionPhase = {
  anchorDay: number;
  cue: string;
  daysLabel: string;
  endDay: number;
  id: CycleNutritionPhaseId;
  name: string;
  startDay: number;
  tokenClassName: {
    background: string;
    text: string;
  };
  tokenVariable: string;
};

export type CycleNutritionViewState = {
  activeDay: number;
  phase: CycleNutritionPhase;
  rotationDegrees: number;
};

export type PillPresentation = {
  isCurrent: boolean;
  isStriped: boolean;
  opacity: number;
  phaseId: CycleNutritionPhaseId;
  tokenVariable: string;
};

export const CYCLE_DAY_COUNT = 28;
export const CYCLE_NUTRITION_START_DAY = 25;
export const CYCLE_NUTRITION_DEGREES_PER_DAY = 360 / CYCLE_DAY_COUNT;

const INITIAL_ROTATION =
  -(CYCLE_NUTRITION_START_DAY - 1) * CYCLE_NUTRITION_DEGREES_PER_DAY;

export const CYCLE_NUTRITION_PHASES = [
  {
    anchorDay: 1,
    cue: "Warm, easy-to-digest foods with iron-rich options.",
    daysLabel: "Days 1–5",
    endDay: 5,
    id: "menstrual",
    name: "Menstrual",
    startDay: 1,
    tokenClassName: {
      background: "bg-cycle-menstrual",
      text: "text-cycle-menstrual",
    },
    tokenVariable: "var(--color-cycle-menstrual)",
  },
  {
    anchorDay: 6,
    cue: "Lighter, fresher meals as your energy comes back.",
    daysLabel: "Days 6–13",
    endDay: 13,
    id: "follicular",
    name: "Follicular",
    startDay: 6,
    tokenClassName: {
      background: "bg-cycle-follicular",
      text: "text-cycle-follicular",
    },
    tokenVariable: "var(--color-cycle-follicular)",
  },
  {
    anchorDay: 14,
    cue: "Colorful veggies · Fiber-rich meals · Fresh, balanced plates",
    daysLabel: "Days 14–16",
    endDay: 16,
    id: "ovulatory",
    name: "Ovulatory",
    startDay: 14,
    tokenClassName: {
      background: "bg-cycle-ovulatory",
      text: "text-cycle-ovulatory",
    },
    tokenVariable: "var(--color-cycle-ovulatory)",
  },
  {
    anchorDay: CYCLE_NUTRITION_START_DAY,
    cue: "Complex carbs, protein-rich meals and root vegetables.",
    daysLabel: "Days 17–28",
    endDay: CYCLE_DAY_COUNT,
    id: "luteal",
    name: "Luteal",
    startDay: 17,
    tokenClassName: {
      background: "bg-cycle-luteal",
      text: "text-cycle-luteal",
    },
    tokenVariable: "var(--color-cycle-luteal)",
  },
] as const satisfies readonly CycleNutritionPhase[];

export const CYCLE_NUTRITION_DAYS = Array.from(
  { length: CYCLE_DAY_COUNT },
  (_, index) => index + 1,
);

function clampProgress(progress: number) {
  return Math.min(Math.max(progress, 0), 1);
}

export function getPhaseForCycleDay(day: number) {
  const normalizedDay = ((Math.round(day) - 1 + CYCLE_DAY_COUNT) % CYCLE_DAY_COUNT) + 1;

  return (
    CYCLE_NUTRITION_PHASES.find(
      (phase) => normalizedDay >= phase.startDay && normalizedDay <= phase.endDay,
    ) ?? CYCLE_NUTRITION_PHASES[3]
  );
}

export function getCycleDayForProgress(progress: number) {
  const daysAdvanced = Math.round(clampProgress(progress) * CYCLE_DAY_COUNT);

  return ((CYCLE_NUTRITION_START_DAY - 1 + daysAdvanced) % CYCLE_DAY_COUNT) + 1;
}

function getRotationForCycleDay(day: number) {
  return -(day - 1) * CYCLE_NUTRITION_DEGREES_PER_DAY;
}

function getRotationForProgress(progress: number) {
  return INITIAL_ROTATION - 360 * clampProgress(progress);
}

export function getCycleNutritionViewState(options: {
  prefersReducedMotion: boolean;
  progress: number;
}): CycleNutritionViewState {
  const smoothDay = getCycleDayForProgress(options.progress);
  const smoothPhase = getPhaseForCycleDay(smoothDay);
  const activeDay = options.prefersReducedMotion ? smoothPhase.anchorDay : smoothDay;
  const phase = getPhaseForCycleDay(activeDay);
  const rotationDegrees = options.prefersReducedMotion
    ? getRotationForCycleDay(activeDay)
    : getRotationForProgress(options.progress);

  return {
    activeDay,
    phase,
    rotationDegrees,
  };
}

export function getPillPresentation(day: number, activeDay: number): PillPresentation {
  const phase = getPhaseForCycleDay(day);
  const isCurrent = day === activeDay;

  if (day >= 1 && day <= 5) {
    return {
      isCurrent,
      isStriped: false,
      opacity: 1 - (day - 1) * 0.1,
      phaseId: "menstrual",
      tokenVariable: "var(--color-cycle-menstrual)",
    };
  }

  if (day >= 23 && day <= CYCLE_DAY_COUNT) {
    return {
      isCurrent,
      isStriped: true,
      opacity: 0.3 + (day - 23) * 0.12,
      phaseId: "menstrual",
      tokenVariable: "var(--color-cycle-menstrual)",
    };
  }

  if (day >= 6 && day <= 8) {
    return {
      isCurrent,
      isStriped: true,
      opacity: 0.5 - (day - 6) * 0.15,
      phaseId: "menstrual",
      tokenVariable: "var(--color-cycle-menstrual)",
    };
  }

  return {
    isCurrent,
    isStriped: false,
    opacity: 0.12,
    phaseId: phase.id,
    tokenVariable: phase.tokenVariable,
  };
}
