import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import { ABSENT_VALUE } from "@eli-coach-platform/ui/lib";
import { PortalWidget, Reading } from "@eli-coach-platform/ui/portal";
import { UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";

import { findCountry } from "~/features/assessment-calls/contracts/countries";
import {
  ageOn,
  labelForGender,
  possessivePronoun,
  subjectPronoun,
} from "~/features/assessment-calls/contracts/visitor-profile";
import { formatCanonicalMeasure } from "~/features/client-onboarding/contracts/canonical-measure";
import type { ClientProfileView } from "~/features/client-onboarding/contracts/client-profile";
import { useReviewDayTimeZone } from "~/features/client-onboarding/ui/coach/onboarding/review-day-format";
import { PhoneLink } from "~/features/coaching-sales/ui/shared/phone-link";

type ClientProfileBlockProps = {
  profile: ClientProfileView | null;
  gender: VisitorGender;
};

type ProfileReadingId =
  | "age"
  | "gender"
  | "country"
  | "phone"
  | "height"
  | "startingWeight"
  | "currentWeight"
  | "activityLevel"
  | "primaryGoal"
  | "dietaryRestrictions"
  | "clientNotes";

type ProfileValues = Record<ProfileReadingId, ReactNode>;

type ProfileReading = {
  id: ProfileReadingId;
  label: string;
  parity: string;
  className?: string;
};

const PROFILE_READINGS: readonly ProfileReading[] = [
  { id: "age", label: "Age", parity: "profile-age" },
  { id: "gender", label: "Gender", parity: "profile-gender" },
  { id: "country", label: "Country", parity: "profile-country" },
  { id: "phone", label: "Phone", parity: "profile-phone" },
  { id: "height", label: "Height", parity: "profile-height" },
  {
    id: "startingWeight",
    label: "Starting weight",
    parity: "profile-starting-weight",
  },
  {
    id: "currentWeight",
    label: "Current weight",
    parity: "profile-current-weight",
  },
  { id: "activityLevel", label: "Activity level", parity: "profile-activity" },
  { id: "primaryGoal", label: "Primary goal", parity: "profile-goal" },
  {
    id: "dietaryRestrictions",
    label: "Dietary restrictions",
    parity: "profile-restrictions",
    className: "col-span-full",
  },
  {
    id: "clientNotes",
    label: "Client notes",
    parity: "profile-notes",
    className: "col-span-full",
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

function weighed(kg: number | null): string {
  return kg === null ? ABSENT_VALUE : formatCanonicalMeasure("weight", kg);
}

function measured(cm: number | null): string {
  return cm === null ? ABSENT_VALUE : formatCanonicalMeasure("height", cm);
}

function profileValues(profile: ClientProfileView, age: number): ProfileValues {
  return {
    age,
    gender: labelForGender(profile.gender),
    country: findCountry(profile.country)?.name ?? profile.country,
    phone: <PhoneLink phone={profile.phone} />,
    height: measured(profile.heightCm),
    startingWeight: weighed(profile.startingWeightKg),
    currentWeight: weighed(profile.currentWeightKg),
    activityLevel: profile.activityLevel ?? ABSENT_VALUE,
    primaryGoal: profile.primaryGoal ?? ABSENT_VALUE,
    dietaryRestrictions: profile.dietaryRestrictions,
    clientNotes: profile.clientNotes ?? ABSENT_VALUE,
  };
}

function profilePendingLine(gender: VisitorGender): string {
  const possessive = possessivePronoun(gender);
  const subject = subjectPronoun(gender);

  return `${possessive.capitalised} profile fills in once ${subject.lower} send${subject.regularVerbSuffix} ${possessive.lower} onboarding.`;
}

export function ClientProfileBlock({
  gender,
  profile,
}: ClientProfileBlockProps) {
  const timeZone = useReviewDayTimeZone();
  const [now] = useState(() => new Date());
  const values = profile
    ? profileValues(
        profile,
        ageOn({ dateOfBirth: profile.dateOfBirth, on: now, timeZone }),
      )
    : PENDING_VALUES;

  return (
    <PortalWidget
      data-parity-root="ClientProfileBlock"
      className="mb-8"
      headingId="profile-panel-heading"
      icon={
        <UserRound
          aria-hidden="true"
          className="text-brand-secondary"
          size={18}
        />
      }
      title="Profile"
    >
      <div className="space-y-5">
        {profile ? null : (
          <p
            className="text-sm text-text-secondary"
            data-parity="profile-pending"
          >
            {profilePendingLine(gender)}
          </p>
        )}
        <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {PROFILE_READINGS.map((reading) => (
            <Reading
              key={reading.id}
              as="dl-item"
              className={reading.className}
              label={reading.label}
              value={values[reading.id]}
              valueParity={reading.parity}
            />
          ))}
        </dl>
      </div>
    </PortalWidget>
  );
}
