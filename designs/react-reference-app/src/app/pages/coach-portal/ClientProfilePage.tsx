import { useForm } from 'react-hook-form';
import { useParams } from 'react-router';
import { CalendarCheck, Dumbbell, Lock, UserRound } from 'lucide-react';
import { AvatarField } from '../../components/AvatarField';
import { ClientNotFound } from '../../components/coach-portal/ClientNotFound';
import { CycleModeInfo } from '../../components/client-profile/CycleModeInfo';
import { IdentityFields } from '../../components/client-profile/IdentityFields';
import { PreferenceRows } from '../../components/client-profile/PreferenceRows';
import { ProfileFieldRows } from '../../components/client-profile/ProfileFieldRows';
import { ProfileFormSection } from '../../components/client-profile/ProfileFormSection';
import { coachIdentityOf, identityValues } from '../../components/client-profile/identityForm';
import {
  coachingOf,
  coachingValues,
  PROFILE_FIELDS,
  SHARED_FACT_FIELDS,
} from '../../components/client-profile/profileFields';
import { useMeasureUnits, type MeasureUnits } from '../../components/client-portal/measureUnits';
import { asText } from '../../components/client-portal/onboarding/onboardingValues';
import { PortalBackLink } from '../../components/PortalBackLink';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { SettingsBody, SettingsSection } from '../../components/SettingsSection';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import type { CoachingFacts } from '../../domain/clientProfile';
import type { ClientJourney } from '../../domain/journey';
import type { OnboardingField } from '../../domain/onboardingSchema';
import { useJourneyClient } from '../../hooks/useJourneyClient';
import {
  clientDetailPathForJourney,
  clientPronouns,
  journeyClientName,
} from '../../utils/journeyLabels';

const GENDER_FIELDS = [PROFILE_FIELDS.gender];

const COACH_ONLY_FIELDS: readonly OnboardingField[] = [
  PROFILE_FIELDS.level,
  PROFILE_FIELDS.primaryGoal,
  PROFILE_FIELDS.goalWeight,
  PROFILE_FIELDS.activityLevel,
];

const CLOSING_FIELDS: readonly OnboardingField[] = [
  PROFILE_FIELDS.dietaryRestrictions,
  PROFILE_FIELDS.coachNotes,
];

const COACHING_ADORNMENTS = {
  cycleMode: <CycleModeInfo />,
  coachNotes: <Lock aria-hidden="true" size={14} className="text-text-secondary" />,
};

function coachingFieldsFor(journey: ClientJourney): readonly OnboardingField[] {
  const cycleFields = journey.profile.identity.gender === 'male' ? [] : [PROFILE_FIELDS.cycleMode];

  return [...SHARED_FACT_FIELDS, ...COACH_ONLY_FIELDS, ...cycleFields, ...CLOSING_FIELDS];
}

function AboutSection({ journey }: { journey: ClientJourney }) {
  const { updateClientProfile } = useClientJourneys();
  const { identity } = journey.profile;
  const { subject, object } = clientPronouns(identity.gender);
  const form = useForm({ defaultValues: identityValues(identity) });

  return (
    <ProfileFormSection
      headingId="client-profile-about-heading"
      title={`About ${object}`}
      icon={UserRound}
      description={`Who ${subject.lower} ${subject.isVerb} and how to reach ${object}.`}
      form={form}
      parityRoot="ClientProfileAbout"
      onSave={(values) => updateClientProfile(journey.callId, { identity: coachIdentityOf(values) })}
    >
      <IdentityFields
        idPrefix="client-profile"
        email={{
          address: identity.email,
          description: `How ${subject.lower} sign${subject.regularVerbSuffix} in.`,
          hint: `${subject.capitalised} sign${subject.regularVerbSuffix} in and pay${subject.regularVerbSuffix} with this address, so it can't be changed.`,
        }}
      />
      <ProfileFieldRows control={form.control} fields={GENDER_FIELDS} />
    </ProfileFormSection>
  );
}

function CoachingForm({
  journey,
  coaching,
  units,
}: {
  journey: ClientJourney;
  coaching: CoachingFacts;
  units: MeasureUnits;
}) {
  const { updateClientProfile } = useClientJourneys();
  const { possessive } = clientPronouns(journey.profile.identity.gender);
  const form = useForm({ defaultValues: coachingValues(coaching, journey.profile.coachNotes, units) });

  return (
    <ProfileFormSection
      headingId="client-profile-coaching-heading"
      title="Coaching"
      icon={Dumbbell}
      description={`What ${possessive.lower} program is built from.`}
      form={form}
      parityRoot="ClientProfileCoaching"
      onSave={(values) =>
        updateClientProfile(journey.callId, {
          coaching: coachingOf(values, units),
          coachNotes: asText(values.coachNotes).trim(),
        })
      }
    >
      <ProfileFieldRows control={form.control} fields={coachingFieldsFor(journey)} adornments={COACHING_ADORNMENTS} />
    </ProfileFormSection>
  );
}

function CoachingSection({ journey }: { journey: ClientJourney }) {
  const units = useMeasureUnits();
  const { coaching } = journey.profile;
  const { possessive } = clientPronouns(journey.profile.identity.gender);

  if (coaching) {
    return <CoachingForm key={`${units.weight}-${units.length}`} journey={journey} coaching={coaching} units={units} />;
  }

  return (
    <SettingsSection
      headingId="client-profile-coaching-heading"
      title="Coaching"
      icon={Dumbbell}
      parityRoot="ClientProfileCoaching"
    >
      <SettingsBody>
        <p className="text-sm text-text-secondary" data-parity="coaching-pending">
          These fill in once {possessive.lower} answers are approved.
        </p>
      </SettingsBody>
    </SettingsSection>
  );
}

function PreferencesSection({ journey }: { journey: ClientJourney }) {
  const { subject, object, possessive } = clientPronouns(journey.profile.identity.gender);

  return (
    <SettingsSection
      headingId="client-profile-preferences-heading"
      title="Preferences"
      icon={CalendarCheck}
      parityRoot="ClientPreferences"
    >
      <PreferenceRows
        settings={journey.settings}
        copy={{
          checkInDay: `The day that suits ${object} for check-ins.`,
          channel: `Where ${subject.lower} want${subject.regularVerbSuffix} to hear from you.`,
          hint: `These come from ${possessive.lower} onboarding answers and stay as ${subject.lower} chose them.`,
        }}
      />
    </SettingsSection>
  );
}

function CoachClientProfile({ journey }: { journey: ClientJourney }) {
  const { updateClientAvatar } = useClientJourneys();
  const { profile } = journey;
  const name = journeyClientName(journey);

  return (
    <div className="w-full max-w-3xl" data-parity-root="ClientProfilePage">
      <PortalBackLink to={clientDetailPathForJourney(journey)}>Back to {name}</PortalBackLink>
      <PortalPageHeader eyebrow={name} title="Profile" />
      <AvatarField
        name={name}
        detail={profile.identity.email}
        avatarUrl={profile.avatarUrl}
        onChange={(avatarUrl) => updateClientAvatar(journey.callId, avatarUrl)}
      />
      <div className="space-y-6 sm:space-y-8" key={`${journey.stage}-${profile.identity.gender}`}>
        <AboutSection journey={journey} />
        <CoachingSection journey={journey} />
        {profile.coaching && <PreferencesSection journey={journey} />}
      </div>
    </div>
  );
}

export function ClientProfilePage() {
  const { id = '' } = useParams();
  const journey = useJourneyClient(id);

  return journey ? <CoachClientProfile journey={journey} /> : <ClientNotFound />;
}
