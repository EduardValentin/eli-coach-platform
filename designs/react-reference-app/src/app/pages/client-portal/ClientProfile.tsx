import { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { Droplet, Dumbbell, ShieldCheck, User } from 'lucide-react';
import { AvatarField } from '../../components/AvatarField';
import { IdentityFields } from '../../components/client-profile/IdentityFields';
import { ProfileFieldRows } from '../../components/client-profile/ProfileFieldRows';
import { ProfileFormSection } from '../../components/client-profile/ProfileFormSection';
import { identityValues, sharedIdentityOf } from '../../components/client-profile/identityForm';
import {
  SHARED_FACT_FIELDS,
  sharedFactsOf,
  sharedFactValues,
} from '../../components/client-profile/profileFields';
import { MeasurementsSection } from '../../components/client-portal/MeasurementsSection';
import { ClientWidget } from '../../components/client-portal/ClientWidget';
import { useMeasureUnits, type MeasureUnits } from '../../components/client-portal/measureUnits';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { Reading } from '../../components/Reading';
import { SettingsBody, SettingsSection } from '../../components/SettingsSection';
import { ABSENT_VALUE } from '../../components/constants';
import { LABEL_CLASS } from '../../components/typography';
import { cn } from '../../components/ui/utils';
import { useAppState } from '../../context/AppContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { useCycle } from '../../context/CycleContext';
import { CLIENT_LEVEL_LABELS, type CoachingFacts } from '../../domain/clientProfile';
import { CYCLE_MODE_LABELS } from '../../domain/cycleMode';
import type { ClientJourney } from '../../domain/journey';
import { journeyClientName, journeyGenderLabel } from '../../utils/journeyLabels';
import { formatBodyWeight } from '../../utils/units';

function AboutYouSection({ journey }: { journey: ClientJourney }) {
  const { updateClientProfile } = useClientJourneys();
  const { identity } = journey.profile;
  const form = useForm({ defaultValues: identityValues(identity) });

  return (
    <ProfileFormSection
      headingId="about-you-heading"
      title="About you"
      icon={User}
      description="Who you are and how your coach reaches you."
      form={form}
      parityRoot="ClientProfileAbout"
      onSave={(values) => updateClientProfile(journey.callId, { identity: sharedIdentityOf(values) })}
    >
      <IdentityFields
        idPrefix="profile"
        email={{
          address: identity.email,
          description: 'How you sign in.',
          hint: "You sign in and pay with this address, so it can't be changed.",
        }}
      />
    </ProfileFormSection>
  );
}

function TrainingSection({
  journey,
  coaching,
  units,
}: {
  journey: ClientJourney;
  coaching: CoachingFacts;
  units: MeasureUnits;
}) {
  const { updateClientProfile } = useClientJourneys();
  const form = useForm({ defaultValues: sharedFactValues(coaching, units) });

  return (
    <ProfileFormSection
      headingId="your-training-heading"
      title="Your training"
      icon={Dumbbell}
      description="What your coach plans your sessions around."
      form={form}
      parityRoot="ClientProfileTraining"
      onSave={(values) => updateClientProfile(journey.callId, { coaching: sharedFactsOf(values, units) })}
    >
      <ProfileFieldRows control={form.control} fields={SHARED_FACT_FIELDS} />
    </ProfileFormSection>
  );
}

function CoachFactsSection({ journey, coaching }: { journey: ClientJourney; coaching: CoachingFacts }) {
  const units = useMeasureUnits();
  const { gender } = journey.profile.identity;

  return (
    <SettingsSection
      headingId="coach-facts-heading"
      title="Your coach keeps these up to date"
      icon={ShieldCheck}
      description="Mention a change at your next check-in."
      parityRoot="ClientCoachFacts"
    >
      <SettingsBody>
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Reading as="dl-item" label="Gender" value={journeyGenderLabel(gender)} valueParity="coach-fact-gender" />
          <Reading as="dl-item" label="Level" value={CLIENT_LEVEL_LABELS[coaching.level]} valueParity="coach-fact-level" />
          <Reading as="dl-item" label="Primary goal" value={coaching.primaryGoal ?? ABSENT_VALUE} valueParity="coach-fact-goal" />
          <Reading
            as="dl-item"
            label="Goal weight"
            value={coaching.goalWeightKg === null ? ABSENT_VALUE : formatBodyWeight(coaching.goalWeightKg, units.weight)}
            valueParity="coach-fact-goal-weight"
          />
          <Reading
            as="dl-item"
            label="Lifestyle activity level"
            value={coaching.activityLevel ?? ABSENT_VALUE}
            valueParity="coach-fact-activity"
          />
          {gender !== 'male' && (
            <Reading
              as="dl-item"
              label="Cycle mode"
              value={CYCLE_MODE_LABELS[coaching.cycleMode]}
              valueParity="coach-fact-cycle-mode"
            />
          )}
          <Reading
            as="dl-item"
            label="Dietary restrictions"
            value={coaching.dietaryRestrictions}
            valueParity="coach-fact-restrictions"
            className="sm:col-span-2"
          />
        </dl>
      </SettingsBody>
    </SettingsSection>
  );
}

function CoachingSections({ journey }: { journey: ClientJourney }) {
  const units = useMeasureUnits();
  const { coaching } = journey.profile;
  if (!coaching) return null;

  return (
    <>
      <TrainingSection key={`${units.weight}-${units.length}`} journey={journey} coaching={coaching} units={units} />
      <CoachFactsSection journey={journey} coaching={coaching} />
    </>
  );
}

function MenstrualHealthWidget() {
  const { clientProfile: menstrualProfile } = useCycle();
  if (!menstrualProfile) return null;

  return (
    <ClientWidget eyebrow="Menstrual health" icon={Droplet} headingId="menstrual-health-heading">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        <Reading label="Cycle" value={menstrualProfile.regularity === 'regular' ? 'Regular' : 'Irregular'} />
        <Reading label="Average Cycle Length" value={`${menstrualProfile.averageCycleLength} days`} />
        <Reading label="Average Period Length" value={`${menstrualProfile.averagePeriodLength} days`} />
        <Reading
          label="Conditions"
          value={menstrualProfile.conditions.length > 0 ? menstrualProfile.conditions.join(', ') : 'None reported'}
        />
      </div>
      {menstrualProfile.notes && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <p className={cn(LABEL_CLASS, 'mb-2')}>Your notes</p>
          <p className="text-sm text-text-secondary leading-relaxed">{menstrualProfile.notes}</p>
        </div>
      )}
    </ClientWidget>
  );
}

export function ClientProfile() {
  const { demoJourney, updateClientAvatar } = useClientJourneys();
  const { appState } = useAppState();
  const { profile } = demoJourney;
  const name = journeyClientName(demoJourney);

  return (
    <div className="w-full max-w-3xl">
      <div data-parity-root="ClientProfileHeader">
        <PortalPageHeader
          title="Your Profile"
          subtitle="Keep your details up to date so your coach plans with the right facts."
        />
      </div>

      <div className="space-y-6 sm:space-y-8">
        <AvatarField
          name={name}
          detail={profile.identity.email}
          avatarUrl={profile.avatarUrl}
          onChange={(avatarUrl) => updateClientAvatar(demoJourney.callId, avatarUrl)}
        />
        <Fragment key={`${demoJourney.callId}-${demoJourney.stage}`}>
          <AboutYouSection journey={demoJourney} />
          <CoachingSections journey={demoJourney} />
          {appState.prototypeMode === 'post-mvp' && <MenstrualHealthWidget />}
        </Fragment>
      </div>

      <MeasurementsSection />
    </div>
  );
}
