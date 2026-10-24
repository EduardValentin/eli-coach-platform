import type { OnboardingField } from "@eli-coach-platform/domain/client-onboarding";
import type { Control } from "react-hook-form";

import { ProfileFieldControl } from "~/features/client-profile/ui/shared/profile/profile-field-control";

import { validateField } from "./onboarding-validation";
import type { OnboardingValues } from "./onboarding-values";
import { useMeasureUnits } from "./unit-preference-store";

type OnboardingFieldControlProps = {
  control: Control<OnboardingValues>;
  field: OnboardingField;
  formFields: readonly OnboardingField[];
};

export function OnboardingFieldControl({
  control,
  field,
  formFields,
}: OnboardingFieldControlProps) {
  const units = useMeasureUnits();

  return (
    <ProfileFieldControl
      control={control}
      field={field}
      units={units}
      validate={validateField(field, { fields: formFields, units })}
    />
  );
}
