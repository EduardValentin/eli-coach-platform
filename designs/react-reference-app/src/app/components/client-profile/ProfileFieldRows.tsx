import type { ReactNode } from 'react';
import type { Control } from 'react-hook-form';
import type { OnboardingField } from '../../domain/onboardingSchema';
import { OnboardingFieldControl } from '../client-portal/onboarding/OnboardingFieldControl';
import type { OnboardingValues } from '../client-portal/onboarding/onboardingValues';
import { SettingsBody } from '../SettingsSection';

type ProfileFieldRowsProps = {
  control: Control<OnboardingValues>;
  fields: readonly OnboardingField[];
  adornments?: Partial<Record<string, ReactNode>>;
};

export function ProfileFieldRows({ control, fields, adornments }: ProfileFieldRowsProps) {
  return (
    <>
      {fields.map((field) => (
        <SettingsBody key={field.id}>
          <OnboardingFieldControl
            chipSize="compact"
            control={control}
            field={field}
            labelAdornment={adornments?.[field.id]}
          />
        </SettingsBody>
      ))}
    </>
  );
}
