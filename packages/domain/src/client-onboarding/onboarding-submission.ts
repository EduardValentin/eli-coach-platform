import type { VisitorGender } from "../assessment-call";
import type { CycleMode } from "../client-profile";

import type {
  OnboardingAnswer,
  OnboardingAnswersByForm,
  OnboardingQuestionId,
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
  const birthDate = new Date(dateOfBirth);
  const yearsSinceBirthYear = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthsSinceBirthMonth = now.getUTCMonth() - birthDate.getUTCMonth();
  const beforeBirthdayThisYear =
    monthsSinceBirthMonth < 0 ||
    (monthsSinceBirthMonth === 0 && now.getUTCDate() < birthDate.getUTCDate());

  return beforeBirthdayThisYear ? yearsSinceBirthYear - 1 : yearsSinceBirthYear;
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

export function clearsSafetyScreening(
  answers: OnboardingAnswersByForm,
): boolean {
  const safety = answers["safety-screening"];

  return PARQ_QUESTION_IDS.every((id) => safety[id] === "No");
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
  if (clearsSafetyScreening(answers)) return "cleared";

  return "needs-review";
}

const NO_PERIOD_VALUE = "No, or very rarely";
const COMBINED_PILL_VALUE = "Combined pill";
const PERIMENOPAUSE_VALUES: ReadonlySet<OnboardingAnswer | undefined> = new Set(
  ["Yes, perimenopause", "Yes, menopause"],
);

export function cycleModeOf(
  answers: OnboardingAnswersByForm,
  gender: VisitorGender,
): CycleMode | null {
  if (gender === "male") return "general";

  const cycle = answers["cycle-context"];
  if (Object.keys(cycle).length === 0) return null;

  const isGeneral =
    cycle.cycleRegularity === NO_PERIOD_VALUE ||
    cycle.hormonalContraception === COMBINED_PILL_VALUE ||
    PERIMENOPAUSE_VALUES.has(cycle.perimenopauseOrMenopause);

  return isGeneral ? "general" : "adapted";
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

export function flaggedAnswerIds(
  answers: OnboardingAnswersByForm,
): OnboardingQuestionId[] {
  const safety = answers["safety-screening"];
  const flagged: OnboardingQuestionId[] = PARQ_QUESTION_IDS.filter(
    (fieldId) => safety[fieldId] === "Yes",
  ).map((fieldId) => ({ formId: "safety-screening", fieldId }));

  if (isPregnancyFlagged(answers))
    flagged.push({ formId: "cycle-context", fieldId: "lifeStage" });
  if (hasMigraineContraceptionSignal(answers))
    flagged.push({ formId: "cycle-context", fieldId: "recurringSymptoms" });

  return flagged;
}
