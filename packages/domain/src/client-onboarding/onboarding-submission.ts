import type {
  OnboardingAnswer,
  OnboardingAnswersByForm,
} from "./onboarding-answers";
import type { OnboardingConsents } from "./onboarding-consents";

export type OnboardingSubmission = {
  answers: OnboardingAnswersByForm;
  consents: OnboardingConsents;
  submittedAt: Date;
};

export const PARQ_MIN_AGE = 15;

export const PARQ_MAX_AGE = 69;

export const PARQ_QUESTION_IDS: readonly string[] = [
  "heartCondition",
  "chestPainOnExertion",
  "dizzinessOrFainting",
  "chronicConditionDiagnosed",
  "chronicConditionMedication",
  "boneOrJointProblem",
  "doctorProhibitedActivity",
];

export type ScreeningOutcome =
  "manual" | "cleared" | "needs-review" | "pending";

export function ageOn(dateOfBirth: string, now: Date): number {
  const dob = new Date(dateOfBirth);
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  const beforeBirthdayThisYear =
    monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate());

  return beforeBirthdayThisYear ? age - 1 : age;
}

export function needsManualScreening(dateOfBirth: string, now: Date): boolean {
  const age = ageOn(dateOfBirth, now);

  return age < PARQ_MIN_AGE || age > PARQ_MAX_AGE;
}

export function withholdsNutritionAdvice(
  answers: OnboardingAnswersByForm,
): boolean {
  const safety = answers["safety-screening"];

  return (
    safety.chronicConditionDiagnosed === "Yes" ||
    safety.chronicConditionMedication === "Yes"
  );
}

export type ScreeningOutcomeInput = {
  answers: OnboardingAnswersByForm;
  dateOfBirth: string;
  now: Date;
};

export function screeningOutcome({
  answers,
  dateOfBirth,
  now,
}: ScreeningOutcomeInput): ScreeningOutcome {
  if (needsManualScreening(dateOfBirth, now)) return "manual";

  const safety = answers["safety-screening"];
  const responses = PARQ_QUESTION_IDS.map((id) => safety[id]);

  if (responses.some((response) => response === undefined || response === null))
    return "pending";
  if (responses.every((response) => response === "No")) return "cleared";

  return "needs-review";
}

export type CycleMode = "phase-based" | "symptom-based" | "manual";

const NO_PERIOD_VALUE = "No, or very rarely";
const COMBINED_PILL_VALUE = "Combined pill";
const NO_LIFE_STAGE_VALUE = "None of these";

function isOnlyNoneOfThese(lifeStage: OnboardingAnswer | undefined): boolean {
  return (
    Array.isArray(lifeStage) &&
    lifeStage.length === 1 &&
    lifeStage[0] === NO_LIFE_STAGE_VALUE
  );
}

export function cycleModeOf(
  answers: OnboardingAnswersByForm,
): CycleMode | null {
  const cycle = answers["cycle-context"];
  if (Object.keys(cycle).length === 0) return null;
  if (cycle.hormonalContraception === "Something else") return "manual";

  const isPhaseBased =
    cycle.cycleRegularity !== NO_PERIOD_VALUE &&
    cycle.hormonalContraception !== COMBINED_PILL_VALUE &&
    isOnlyNoneOfThese(cycle.lifeStage) &&
    (cycle.perimenopauseOrMenopause === "No" ||
      cycle.perimenopauseOrMenopause === "I'm not sure");

  return isPhaseBased ? "phase-based" : "symptom-based";
}

const MIGRAINE_CONTRACEPTION_SIGNAL = {
  symptomsKey: "recurringSymptoms",
  symptomValue: "Migraines",
  contraceptionKey: "hormonalContraception",
  contraceptionValue: "Combined pill",
};

export function hasMigraineContraceptionSignal(
  answers: OnboardingAnswersByForm,
): boolean {
  const cycle = answers["cycle-context"];
  const symptoms = cycle[MIGRAINE_CONTRACEPTION_SIGNAL.symptomsKey];
  const contraception = cycle[MIGRAINE_CONTRACEPTION_SIGNAL.contraceptionKey];

  if (!Array.isArray(symptoms) || contraception === undefined) return false;

  return (
    symptoms.includes(MIGRAINE_CONTRACEPTION_SIGNAL.symptomValue) &&
    contraception === MIGRAINE_CONTRACEPTION_SIGNAL.contraceptionValue
  );
}

const PREGNANCY_ANSWERS: ReadonlySet<string> = new Set([
  "Pregnant",
  "Postpartum (in the last 12 months)",
]);

export function isPregnancyFlagged(answers: OnboardingAnswersByForm): boolean {
  const lifeStage = answers["cycle-context"].lifeStage;

  return (
    Array.isArray(lifeStage) &&
    lifeStage.some((value) => PREGNANCY_ANSWERS.has(value))
  );
}
