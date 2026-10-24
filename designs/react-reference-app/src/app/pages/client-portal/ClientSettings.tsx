import { CalendarCheck } from 'lucide-react';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { SettingsSection } from '../../components/SettingsSection';
import { UnitPreferencesSettings } from '../../components/UnitPreferencesSettings';
import { PreferenceRows } from '../../components/client-profile/PreferenceRows';
import { SubscriptionSection } from '../../components/client-portal/SubscriptionSection';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { measuredWeights } from '../../domain/clientProfile';

const PREFERENCE_COPY = {
  checkInDay: 'The day that suits you for check-ins.',
  channel: 'Where you hear from your coach.',
  hint: 'Your coach changes these for you for now.',
};

export function ClientSettings() {
  const { demoJourney } = useClientJourneys();
  const { coaching } = demoJourney.profile;
  const { currentWeightKg } = measuredWeights(demoJourney.measurements);

  return (
    <div
      className="w-full max-w-3xl space-y-6 sm:space-y-8"
      data-parity-root="ClientSettings"
    >
      <PortalPageHeader
        title="Settings"
        subtitle="Your coaching, and how your measurements are shown across the app."
      />

      <SubscriptionSection />

      <div data-parity="unit-preferences">
        <UnitPreferencesSettings
          sampleWeightKg={currentWeightKg ?? undefined}
          sampleHeightCm={coaching?.heightCm ?? undefined}
          description="Saved to your account, so every device shows the same units."
        />
      </div>

      {coaching && (
        <SettingsSection
          headingId="check-ins-contact-heading"
          title="Check-ins and contact"
          icon={CalendarCheck}
          parityRoot="ClientPreferences"
        >
          <PreferenceRows settings={demoJourney.settings} copy={PREFERENCE_COPY} />
        </SettingsSection>
      )}
    </div>
  );
}
