import { PortalPageHeader } from '../../components/PortalPageHeader';
import { AssessmentCallSettingsSection } from '../../components/coach-portal/AssessmentCallSettingsSection';
import { UnitPreferencesSettings } from '../../components/UnitPreferencesSettings';

export function CoachSettings() {
  return (
    <div className="w-full max-w-3xl space-y-6 sm:space-y-8">
      <PortalPageHeader
        title="Settings"
        subtitle="Manage how you take assessment calls and how measurements are shown."
      />

      <AssessmentCallSettingsSection />

      <UnitPreferencesSettings />

      <p className="text-xs text-muted-foreground px-1">
        Preferences are saved to this device.
      </p>
    </div>
  );
}
