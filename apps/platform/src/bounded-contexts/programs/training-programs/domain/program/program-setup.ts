import type {
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
  goal?: "missing";
  equipment?: "missing" | "exclusive" | "unknown";
};

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
    equipmentOptions: readonly EquipmentOption[],
  ): ProgramSetupResult {
    const goal = entered.goal.trim();
    const equipment = ProgramSetup.equipmentProblem(
      entered.equipment,
      equipmentOptions,
    );
    const problems: ProgramSetupProblems = {
      ...(goal === "" && { goal: "missing" }),
      ...(equipment && { equipment }),
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

  changesEquipment(current: readonly string[]): boolean {
    const chosen = this.values.equipment;

    return !(
      chosen.length === current.length &&
      chosen.every((item) => current.includes(item))
    );
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
