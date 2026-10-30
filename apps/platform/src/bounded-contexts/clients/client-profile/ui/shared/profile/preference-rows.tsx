import type { PreferredChannel } from "~/bounded-contexts/clients/client-profile/domain/client-settings";
import { ABSENT_VALUE } from "~/shared/design-system/lib";
import { SettingsRow, SettingsRows } from "~/shared/design-system/portal";

import { WEEKDAY_LABELS } from "~/bounded-contexts/scheduling/coach-schedule/ui/shared/weekday-labels";
import type { ClientProfileView } from "~/bounded-contexts/clients/client-profile/public/client-profile";

import { ReadOnlyValue } from "./read-only-value";

type PreferenceCopy = {
  checkInDay: string;
  channel: string;
  hint: string;
};

type PreferenceRowsProps = {
  preferences: ClientProfileView["preferences"];
  copy: PreferenceCopy;
};

const PREFERRED_CHANNEL_LABELS: Record<PreferredChannel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
};

export function PreferenceRows({ preferences, copy }: PreferenceRowsProps) {
  const { preferredCheckInWeekday, preferredChannel } = preferences;

  return (
    <SettingsRows>
      <SettingsRow description={copy.checkInDay} title="Check-in day">
        <ReadOnlyValue
          hint={{
            label: "Why the check-in day can't be changed",
            text: copy.hint,
          }}
          parity="preference-checkin-day"
          value={
            preferredCheckInWeekday
              ? WEEKDAY_LABELS[preferredCheckInWeekday].full
              : ABSENT_VALUE
          }
        />
      </SettingsRow>
      <SettingsRow description={copy.channel} title="Channel">
        <ReadOnlyValue
          hint={{ label: "Why the channel can't be changed", text: copy.hint }}
          parity="preference-channel"
          value={
            preferredChannel
              ? PREFERRED_CHANNEL_LABELS[preferredChannel]
              : ABSENT_VALUE
          }
        />
      </SettingsRow>
    </SettingsRows>
  );
}
