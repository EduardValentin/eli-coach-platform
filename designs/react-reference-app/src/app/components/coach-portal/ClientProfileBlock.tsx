import { UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  measuredWeights,
  type JourneyProfile,
  type MeasuredWeights,
} from '../../domain/clientProfile';
import type {
  ClientJourney,
  JourneyGender,
  JourneyIdentity,
} from '../../domain/journey';
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

type IdentityReadingId = 'age' | 'gender' | 'country' | 'phone';

type FactReadingId =
  | 'height'
  | 'startingWeight'
  | 'currentWeight'
  | 'activityLevel'
  | 'primaryGoal'
  | 'dietaryRestrictions'
  | 'clientNotes';

type ProfileReadingId = IdentityReadingId | FactReadingId;

type IdentityValues = Record<IdentityReadingId, ReactNode>;

type FactValues = Record<FactReadingId, ReactNode>;

type ProfileValues = IdentityValues & FactValues;

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

const AWAITING_FACT_VALUES: FactValues = {
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

function identityValues(identity: JourneyIdentity): IdentityValues {
  return {
    age: ageOn(identity.dateOfBirth, new Date()),
    gender: journeyGenderLabel(identity.gender),
    country: identity.country || ABSENT_VALUE,
    phone: <PhoneLink phone={identity.phone} />,
  };
}

function factValues(
  profile: JourneyProfile,
  weights: MeasuredWeights,
): FactValues {
  return {
    height: heightReading(profile.heightCm),
    startingWeight: weightReading(weights.startingWeightKg),
    currentWeight: weightReading(weights.currentWeightKg),
    activityLevel: profile.activityLevel ?? ABSENT_VALUE,
    primaryGoal: profile.primaryGoal ?? ABSENT_VALUE,
    dietaryRestrictions: profile.dietaryRestrictions,
    clientNotes: profile.clientNotes ?? ABSENT_VALUE,
  };
}

function profileValues(journey: ClientJourney): ProfileValues {
  const identity = identityValues(journey.identity);
  if (!journey.profile) return { ...identity, ...AWAITING_FACT_VALUES };

  return {
    ...identity,
    ...factValues(journey.profile, measuredWeights(journey.measurements)),
  };
}

function profilePendingLine(gender: JourneyGender): string {
  const { subject, possessive } = clientPronouns(gender);

  return `${possessive.capitalised} profile fills in once ${subject.lower} send${subject.regularVerbSuffix} ${possessive.lower} onboarding.`;
}

export function ClientProfileBlock({ journey }: { journey: ClientJourney }) {
  const { profile } = journey;
  const values = profileValues(journey);

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
