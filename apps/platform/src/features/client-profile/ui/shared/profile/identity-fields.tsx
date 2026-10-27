import { useCalendarDayTimeZone } from "~/shared/design-system/lib";
import { SettingsBody, SettingsRow } from "~/shared/design-system/portal";
import { useState } from "react";
import { useController, type Control } from "react-hook-form";

import { DateOfBirthField } from "~/features/assessment-calls/ui/shared/date-of-birth-field";
import { PhoneField } from "~/features/assessment-calls/ui/shared/phone-field";

import { IDENTITY_FIELDS, type IdentityValues } from "./identity-form";
import { ProfileFieldRows } from "./profile-field-control";
import { ReadOnlyValue } from "./read-only-value";

type EmailCopy = {
  address: string;
  description: string;
  hint: string;
};

type IdentityFieldsProps = {
  control: Control<IdentityValues>;
  email: EmailCopy;
  idPrefix: string;
};

const NAME_FIELDS = [IDENTITY_FIELDS.firstName, IDENTITY_FIELDS.lastName];

const COUNTRY_FIELDS = [IDENTITY_FIELDS.country];

export function IdentityFields({
  control,
  email,
  idPrefix,
}: IdentityFieldsProps) {
  const timeZone = useCalendarDayTimeZone();
  const [now] = useState(() => new Date());
  const dateOfBirth = useController({ control, name: "dateOfBirth" });
  const phoneCountry = useController({ control, name: "phoneCountry" });
  const phoneNumber = useController({ control, name: "phoneNumber" });

  return (
    <>
      <ProfileFieldRows control={control} fields={NAME_FIELDS} />
      <SettingsRow description={email.description} title="Email">
        <ReadOnlyValue
          hint={{ label: "Why the email can't be changed", text: email.hint }}
          parity="identity-email"
          value={email.address}
        />
      </SettingsRow>
      <SettingsBody>
        <DateOfBirthField
          error={dateOfBirth.fieldState.error?.message}
          id={`${idPrefix}-date-of-birth`}
          label="Date of birth"
          now={now}
          onChange={dateOfBirth.field.onChange}
          timeZone={timeZone}
          value={dateOfBirth.field.value}
        />
      </SettingsBody>
      <SettingsBody>
        <PhoneField
          country={phoneCountry.field.value}
          error={phoneNumber.fieldState.error?.message}
          id={`${idPrefix}-phone`}
          number={phoneNumber.field.value}
          onCountryChange={phoneCountry.field.onChange}
          onNumberChange={phoneNumber.field.onChange}
        />
      </SettingsBody>
      <ProfileFieldRows control={control} fields={COUNTRY_FIELDS} />
    </>
  );
}
