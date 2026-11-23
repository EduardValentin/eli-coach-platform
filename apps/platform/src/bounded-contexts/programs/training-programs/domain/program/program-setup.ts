import type {
  ClientCoaching,
  ClientCoachingFacts,
  EquipmentOption,
} from "./client-coaching-port";
import { SplitTemplate } from "./split-template";
import {
  DEFAULT_DAILY_STEPS,
  type ClientLevel,
  type ProgramLanguage,
  type SessionMinutes,
  type SplitShape,
  type TrainingDays,
} from "./vocabulary";

export type ProgramSetupValues = {
  goal: string;
  level: ClientLevel;
  trainingDays: TrainingDays;
  sessionMinutes: SessionMinutes;
  language: ProgramLanguage;
  dailySteps: number;
  splitShape: SplitShape;
  equipment: readonly string[];
};

export type ProgramSetupProblems = {
  goal?: "missing" | "unknown";
  equipment?: "missing" | "exclusive" | "unknown";
};

type ProgramSetupChoices = Pick<
  ClientCoaching,
  "goalOptions" | "equipmentOptions"
>;

export type ProgramSetupResult =
  | { status: "valid"; setup: ProgramSetup }
  | { status: "invalid"; problems: ProgramSetupProblems };

export class ProgramSetup {
  private constructor(readonly values: ProgramSetupValues) {}

  static startingValues(
    coachingFacts: ClientCoachingFacts,
  ): ProgramSetupValues {
    return {
      goal: coachingFacts.goal ?? "",
      level: coachingFacts.level,
      trainingDays: coachingFacts.trainingDays,
      sessionMinutes: coachingFacts.sessionMinutes,
      language: "en",
      dailySteps: DEFAULT_DAILY_STEPS,
      splitShape: SplitTemplate.forTrainingDays(coachingFacts.trainingDays)
        .shape,
      equipment: [...coachingFacts.equipment],
    };
  }

  static from(
    entered: ProgramSetupValues,
    choices: ProgramSetupChoices,
  ): ProgramSetupResult {
    const goal = entered.goal.trim();
    const goalProblem = ProgramSetup.goalProblem(goal, choices.goalOptions);
    const equipmentProblem = ProgramSetup.equipmentProblem(
      entered.equipment,
      choices.equipmentOptions,
    );
    const problems: ProgramSetupProblems = {
      ...(goalProblem && { goal: goalProblem }),
      ...(equipmentProblem && { equipment: equipmentProblem }),
    };

    return Object.keys(problems).length > 0
      ? { status: "invalid", problems }
      : {
          status: "valid",
          setup: new ProgramSetup({
            ...entered,
            goal,
            equipment: [...entered.equipment],
          }),
        };
  }

  private static goalProblem(
    goal: string,
    options: readonly string[],
  ): ProgramSetupProblems["goal"] {
    if (goal === "") return "missing";
    if (!options.includes(goal)) return "unknown";

    return undefined;
  }

  private static equipmentProblem(
    equipment: readonly string[],
    options: readonly EquipmentOption[],
  ): ProgramSetupProblems["equipment"] {
    const chosen = equipment.map((value) =>
      options.find((option) => option.value === value),
    );

    if (chosen.length === 0) return "missing";
    if (chosen.some((option) => option === undefined)) return "unknown";
    if (chosen.length > 1 && chosen.some((option) => option?.exclusive)) {
      return "exclusive";
    }

    return undefined;
  }
}
