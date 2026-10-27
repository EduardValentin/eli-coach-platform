import {
  ONBOARDING_FORMS,
  type OnboardingFormDefinition,
  type OnboardingFormId,
} from "@eli-coach-platform/domain/client-onboarding";

type StepPosition = { currentFormIndex: number };

export function stepsOf(
  formIds: readonly OnboardingFormId[],
): OnboardingFormDefinition[] {
  return formIds.flatMap((formId) =>
    ONBOARDING_FORMS.filter((form) => form.id === formId),
  );
}

export function stepIndexOf(
  steps: readonly OnboardingFormDefinition[],
  { currentFormIndex }: StepPosition,
): number {
  return Math.min(currentFormIndex, steps.length - 1);
}

export function currentStepOf(
  steps: readonly OnboardingFormDefinition[],
  position: StepPosition,
): OnboardingFormDefinition {
  return steps[stepIndexOf(steps, position)];
}

export function firstSpecialCategoryIndex(
  steps: readonly OnboardingFormDefinition[],
): number {
  return steps.findIndex((step) => step.sensitivity === "special-category");
}

export function stepIndexOfForm(
  steps: readonly OnboardingFormDefinition[],
  formId: OnboardingFormId,
): number {
  return Math.max(
    0,
    steps.findIndex((step) => step.id === formId),
  );
}
