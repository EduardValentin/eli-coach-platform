import { UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import type { JourneyProfile } from '../../domain/clientProfile';
import type { ClientJourney, JourneyGender } from '../../domain/journey';
import {
  canonicalLengthReading,
  canonicalWeightReading,
} from '../../domain/onboardingAnswers';
import { ageOn } from '../../services/visitorProfile';
import { clientPronouns, journeyGenderLabel } from '../../utils/journeyLabels';
import { PortalWidget } from '../PortalWidget';
import { Reading } from '../Reading';
import { ABSENT_VALUE } from '../constants';
import { PhoneLink } from './PhoneLink';

type ProfileReadingId =
  | 'age'
  | 'gender'
  | 'country'
  | 'phone'
  | 'height'
  | 'startingWeight'
  | 'currentWeight'
  | 'activityLevel'
  | 'primaryGoal'
  | 'dietaryRestrictions'
  | 'clientNotes';

type ProfileValues = Record<ProfileReadingId, ReactNode>;

type ProfileReading = {
  id: ProfileReadingId;
  label: string;
  parity: string;
  className?: string;
};

const PROFILE_READINGS: readonly ProfileReading[] = [
  { id: 'age', label: 'Age', parity: 'profile-age' },
  { id: 'gender', label: 'Gender', parity: 'profile-gender' },
  { id: 'country', label: 'Country', parity: 'profile-country' },
  { id: 'phone', label: 'Phone', parity: 'profile-phone' },
  { id: 'height', label: 'Height', parity: 'profile-height' },
  {
    id: 'startingWeight',
    label: 'Starting weight',
    parity: 'profile-starting-weight',
  },
  {
    id: 'currentWeight',
    label: 'Current weight',
    parity: 'profile-current-weight',
  },
  { id: 'activityLevel', label: 'Activity level', parity: 'profile-activity' },
  { id: 'primaryGoal', label: 'Primary goal', parity: 'profile-goal' },
  {
    id: 'dietaryRestrictions',
    label: 'Dietary restrictions',
    parity: 'profile-restrictions',
    className: 'col-span-full',
  },
  {
    id: 'clientNotes',
    label: 'Client notes',
    parity: 'profile-notes',
    className: 'col-span-full',
  },
];

const PENDING_VALUES: ProfileValues = {
  age: ABSENT_VALUE,
  gender: ABSENT_VALUE,
  country: ABSENT_VALUE,
  phone: ABSENT_VALUE,
  height: ABSENT_VALUE,
  startingWeight: ABSENT_VALUE,
  currentWeight: ABSENT_VALUE,
  activityLevel: ABSENT_VALUE,
  primaryGoal: ABSENT_VALUE,
  dietaryRestrictions: ABSENT_VALUE,
  clientNotes: ABSENT_VALUE,
};

function weightReading(kg: number | null): string {
  return kg === null ? ABSENT_VALUE : canonicalWeightReading(kg);
}

function heightReading(cm: number | null): string {
  return cm === null ? ABSENT_VALUE : canonicalLengthReading(cm);
}

function profileValues(profile: JourneyProfile): ProfileValues {
  return {
    age: ageOn(profile.dateOfBirth, new Date()),
    gender: journeyGenderLabel(profile.gender),
    country: profile.country || ABSENT_VALUE,
    phone: <PhoneLink phone={profile.phone} />,
    height: heightReading(profile.heightCm),
    startingWeight: weightReading(profile.startingWeightKg),
    currentWeight: weightReading(profile.currentWeightKg),
    activityLevel: profile.activityLevel ?? ABSENT_VALUE,
    primaryGoal: profile.primaryGoal ?? ABSENT_VALUE,
    dietaryRestrictions: profile.dietaryRestrictions,
    clientNotes: profile.clientNotes ?? ABSENT_VALUE,
  };
}

function profilePendingLine(gender: JourneyGender): string {
  const { subject, possessive } = clientPronouns(gender);

  return `${possessive.capitalised} profile fills in once ${subject.lower} send${subject.regularVerbSuffix} ${possessive.lower} onboarding.`;
}

export function ClientProfileBlock({ journey }: { journey: ClientJourney }) {
  const { profile } = journey;
  const values = profile ? profileValues(profile) : PENDING_VALUES;

  return (
    <PortalWidget
      presentation="coach"
      title="Profile"
      icon={
        <UserRound
          aria-hidden="true"
          className="text-brand-secondary"
          size={18}
        />
      }
      headingId="profile-panel-heading"
      parityRoot="ClientProfileBlock"
      className="mb-8"
    >
      <div className="space-y-5">
        {!profile && (
          <p
            className="text-sm text-text-secondary"
            data-parity="profile-pending"
          >
            {profilePendingLine(journey.identity.gender)}
          </p>
        )}
        <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {PROFILE_READINGS.map((reading) => (
            <Reading
              key={reading.id}
              as="dl-item"
              label={reading.label}
              value={values[reading.id]}
              valueParity={reading.parity}
              className={reading.className}
            />
          ))}
        </dl>
      </div>
    </PortalWidget>
  );
}
