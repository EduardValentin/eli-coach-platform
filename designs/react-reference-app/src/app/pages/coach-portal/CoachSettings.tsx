import { UnitPreferencesSettings } from '../../components/UnitPreferencesSettings';

export function CoachSettings() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 pb-12">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground leading-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Choose how measurements are shown across your coaching tools.</p>
      </header>

      <UnitPreferencesSettings />

      <p className="text-xs text-muted-foreground px-1">Preferences are saved to this device.</p>
    </div>
  );
}
