import {
  PREFERRED_CHANNEL_LABELS,
  type ClientSettings,
} from '../../domain/clientProfile';
import { WEEKDAY_LABELS } from '../../domain/program';
import { ABSENT_VALUE } from '../constants';
import { SettingsRow, SettingsRows } from '../SettingsSection';
import { ReadOnlyValue } from './ReadOnlyValue';

export type PreferenceCopy = {
  checkInDay: string;
  channel: string;
  hint: string;
};

type PreferenceRowsProps = {
  settings: ClientSettings;
  copy: PreferenceCopy;
};

export function PreferenceRows({ settings, copy }: PreferenceRowsProps) {
  const { preferredCheckInWeekday, preferredChannel } = settings;

  return (
    <SettingsRows>
      <SettingsRow title="Check-in day" description={copy.checkInDay}>
        <ReadOnlyValue
          value={preferredCheckInWeekday ? WEEKDAY_LABELS[preferredCheckInWeekday] : ABSENT_VALUE}
          hint={copy.hint}
          hintLabel="Why the check-in day can't be changed"
          parity="preference-checkin-day"
        />
      </SettingsRow>
      <SettingsRow title="Channel" description={copy.channel}>
        <ReadOnlyValue
          value={preferredChannel ? PREFERRED_CHANNEL_LABELS[preferredChannel] : ABSENT_VALUE}
          hint={copy.hint}
          hintLabel="Why the channel can't be changed"
          parity="preference-channel"
        />
      </SettingsRow>
    </SettingsRows>
  );
}
