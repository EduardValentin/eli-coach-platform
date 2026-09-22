import { PortalPageHeader } from '../../components/PortalPageHeader';
import { UnitPreferencesSettings } from '../../components/UnitPreferencesSettings';
import { SubscriptionSection } from '../../components/client-portal/SubscriptionSection';
import { useClientProfile } from '../../context/ClientProfileContext';

export function ClientSettings() {
  const { clientProfile } = useClientProfile();

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
      <PortalPageHeader
        title="Settings"
        subtitle="Your coaching, and how your measurements are shown across the app."
      />

      <SubscriptionSection />

      <UnitPreferencesSettings
        sampleWeightKg={clientProfile?.currentWeightKg}
        sampleHeightCm={clientProfile?.heightCm}
      />

      <p className="text-xs text-muted-foreground px-1">Preferences are saved to this device.</p>
    </div>
  );
}
