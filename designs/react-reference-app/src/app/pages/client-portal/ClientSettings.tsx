import { UnitPreferencesSettings } from '../../components/UnitPreferencesSettings';
import { useClientProfile } from '../../context/ClientProfileContext';

export function ClientSettings() {
  const { clientProfile } = useClientProfile();

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 pb-12">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground leading-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Choose how your measurements are shown across the app.</p>
      </header>

      <UnitPreferencesSettings
        sampleWeightKg={clientProfile?.currentWeightKg}
        sampleHeightCm={clientProfile?.heightCm}
      />

      <p className="text-xs text-muted-foreground px-1">Preferences are saved to this device.</p>
    </div>
  );
}
