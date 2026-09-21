import { Mail, User } from 'lucide-react';
import { motion } from 'motion/react';
import type { FormEvent } from 'react';
import { COUNTRIES } from '../../services/countries';
import {
  VISITOR_GENDERS,
  VISITOR_PRIMARY_GOALS,
  type VisitorGender,
  type VisitorPrimaryGoal,
} from '../../services/visitorProfile';
import { FIELD_ERROR_CLASS } from '../../utils/formFieldStyles';
import { Button } from '../ThemeButton';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ChoiceSelectField } from './ChoiceSelectField';
import { DateOfBirthField } from './DateOfBirthField';
import { PhoneField } from './PhoneField';
import type { BookingDetailsForm, BookingField } from './useBookingDetailsForm';

export const FIELD_IDS: Record<BookingField, string> = {
  firstName: 'first-name',
  lastName: 'last-name',
  email: 'email',
  dateOfBirth: 'date-of-birth',
  gender: 'gender',
  primaryGoal: 'primary-goal',
  country: 'country',
  phone: 'phone-number',
  notes: 'notes',
};

const COUNTRY_OPTIONS = COUNTRIES.map((country) => ({
  value: country.code,
  label: country.name,
}));

export function BookingDetailsStep({
  form,
  now,
  isSubmitting,
  onSubmit,
}: {
  form: BookingDetailsForm;
  now: Date;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { fieldErrors } = form;

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5 flex-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor={FIELD_IDS.firstName} className="text-text-label font-medium">First name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" aria-hidden="true" />
            <Input
              id={FIELD_IDS.firstName}
              required
              autoComplete="given-name"
              placeholder="Jane"
              className="pl-9"
              value={form.firstName}
              onChange={(e) => form.setFirstName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.firstName) || undefined}
              aria-describedby={fieldErrors.firstName ? 'first-name-error' : undefined}
            />
          </div>
          {fieldErrors.firstName && (
            <p id="first-name-error" className={FIELD_ERROR_CLASS}>{fieldErrors.firstName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={FIELD_IDS.lastName} className="text-text-label font-medium">Last name</Label>
          <Input
            id={FIELD_IDS.lastName}
            required
            autoComplete="family-name"
            placeholder="Doe"
            value={form.lastName}
            onChange={(e) => form.setLastName(e.target.value)}
            aria-invalid={Boolean(fieldErrors.lastName) || undefined}
            aria-describedby={fieldErrors.lastName ? 'last-name-error' : undefined}
          />
          {fieldErrors.lastName && (
            <p id="last-name-error" className={FIELD_ERROR_CLASS}>{fieldErrors.lastName}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={FIELD_IDS.email} className="text-text-label font-medium">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" aria-hidden="true" />
          <Input
            id={FIELD_IDS.email}
            type="email"
            required
            autoComplete="email"
            placeholder="jane@example.com"
            className="pl-9"
            value={form.email}
            onChange={(e) => form.setEmail(e.target.value)}
            aria-invalid={Boolean(fieldErrors.email) || undefined}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          />
        </div>
        {fieldErrors.email && (
          <p id="email-error" className={FIELD_ERROR_CLASS}>{fieldErrors.email}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <DateOfBirthField
          id={FIELD_IDS.dateOfBirth}
          label="Date of birth"
          value={form.dateOfBirth}
          error={fieldErrors.dateOfBirth}
          now={now}
          onChange={form.setDateOfBirth}
        />
        <ChoiceSelectField
          id={FIELD_IDS.gender}
          label="Gender"
          placeholder="Select"
          value={form.gender}
          options={VISITOR_GENDERS}
          error={fieldErrors.gender}
          onValueChange={(value) => form.setGender(value as VisitorGender)}
        />
      </div>

      <ChoiceSelectField
        id={FIELD_IDS.primaryGoal}
        label="Primary goal"
        placeholder="Select your goal"
        value={form.primaryGoal}
        options={VISITOR_PRIMARY_GOALS}
        error={fieldErrors.primaryGoal}
        onValueChange={(value) => form.setPrimaryGoal(value as VisitorPrimaryGoal)}
      />

      <ChoiceSelectField
        id={FIELD_IDS.country}
        label="Country"
        placeholder="Select your country"
        value={form.country}
        options={COUNTRY_OPTIONS}
        error={fieldErrors.country}
        autoComplete="country-name"
        onValueChange={form.setCountry}
      />

      <PhoneField
        id="phone"
        country={form.phoneCountry}
        number={form.phoneNumber}
        error={fieldErrors.phone}
        onCountryChange={form.setPhoneCountry}
        onNumberChange={form.setPhoneNumber}
      />

      <div className="space-y-2">
        <Label htmlFor={FIELD_IDS.notes} className="text-text-label font-medium">Anything to share beforehand? (Optional)</Label>
        <Textarea
          id={FIELD_IDS.notes}
          placeholder="e.g. recovering from a knee injury"
          className="h-24"
          value={form.notes}
          onChange={(e) => form.setNotes(e.target.value)}
          aria-invalid={Boolean(fieldErrors.notes) || undefined}
          aria-describedby={fieldErrors.notes ? 'notes-error' : undefined}
        />
        {fieldErrors.notes && (
          <p id="notes-error" className={FIELD_ERROR_CLASS}>{fieldErrors.notes}</p>
        )}
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting || undefined}
          weight="semibold"
          width="full"
        >
          {isSubmitting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                aria-hidden="true"
              />
              <span className="sr-only">Scheduling your call</span>
            </>
          ) : (
            'Schedule Call'
          )}
        </Button>
      </div>
    </form>
  );
}
