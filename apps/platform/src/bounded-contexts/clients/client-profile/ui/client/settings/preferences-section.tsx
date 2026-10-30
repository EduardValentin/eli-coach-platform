import { SettingsSection } from "~/shared/design-system/portal";
import { CalendarCheck } from "lucide-react";

import type { ClientSettingsView } from "~/bounded-contexts/clients/client-profile/public/client-settings";
import { PreferenceRows } from "~/bounded-contexts/clients/client-profile/ui/shared/profile/preference-rows";

const PREFERENCE_COPY = {
  checkInDay: "The day that suits you for check-ins.",
  channel: "Where you hear from your coach.",
  hint: "Your coach changes these for you for now.",
};

export function PreferencesSection({
  settings,
}: {
  settings: ClientSettingsView;
}) {
  return (
    <SettingsSection
      data-parity-root="ClientPreferences"
      headingId="check-ins-contact-heading"
      icon={CalendarCheck}
      title="Check-ins and contact"
    >
      <PreferenceRows copy={PREFERENCE_COPY} preferences={settings} />
    </SettingsSection>
  );
}
