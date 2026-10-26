import { useFormContext } from 'react-hook-form';
import { DateOfBirthField } from '../booking/DateOfBirthField';
import { PhoneField } from '../booking/PhoneField';
import { asText, type OnboardingValues } from '../client-portal/onboarding/onboardingValues';
import { SettingsBody, SettingsRow } from '../SettingsSection';
import { FormField } from '../ui/form';
import { PROFILE_FIELDS } from './profileFields';
import { ProfileFieldRows } from './ProfileFieldRows';
import { dateOfBirthProblem, phoneProblem } from './identityForm';
import { ReadOnlyValue } from './ReadOnlyValue';

type EmailCopy = {
  address: string;
  description: string;
  hint: string;
};

type IdentityFieldsProps = {
  idPrefix: string;
  email: EmailCopy;
};

const NAME_FIELDS = [PROFILE_FIELDS.firstName, PROFILE_FIELDS.lastName];

const COUNTRY_FIELDS = [PROFILE_FIELDS.country];

export function IdentityFields({ idPrefix, email }: IdentityFieldsProps) {
  const form = useFormContext<OnboardingValues>();
  const today = new Date();

  return (
    <>
      <ProfileFieldRows control={form.control} fields={NAME_FIELDS} />
      <SettingsRow title="Email" description={email.description}>
        <ReadOnlyValue
          value={email.address}
          hint={email.hint}
          hintLabel="Why the email can't be changed"
          parity="identity-email"
        />
      </SettingsRow>
      <SettingsBody>
        <FormField
          control={form.control}
          name="dateOfBirth"
          rules={{ validate: (value) => dateOfBirthProblem(asText(value), today) }}
          render={({ field, fieldState }) => (
            <DateOfBirthField
              id={`${idPrefix}-date-of-birth`}
              label="Date of birth"
              value={asText(field.value)}
              error={fieldState.error?.message}
              now={today}
              onChange={field.onChange}
            />
          )}
        />
      </SettingsBody>
      <SettingsBody>
        <FormField
          control={form.control}
          name="phoneNumber"
          rules={{ validate: (_value, values) => phoneProblem(values) }}
          render={({ field, fieldState }) => (
            <PhoneField
              id={`${idPrefix}-phone`}
              country={asText(form.watch('phoneCountry'))}
              number={asText(field.value)}
              error={fieldState.error?.message}
              onCountryChange={(code) => form.setValue('phoneCountry', code, { shouldDirty: true })}
              onNumberChange={field.onChange}
            />
          )}
        />
      </SettingsBody>
      <ProfileFieldRows control={form.control} fields={COUNTRY_FIELDS} />
    </>
  );
}
