import {
  PortalBackLink,
  PortalPageHeader,
  SettingsSection,
} from "~/shared/design-system/portal";
import { CalendarCheck } from "lucide-react";

import {
  objectPronoun,
  possessivePronoun,
  subjectPronoun,
} from "~/bounded-contexts/scheduling/assessment-calls/public/visitor-profile";
import type { ClientProfileView } from "~/bounded-contexts/clients/client-profile/public/client-profile";
import { coachClientAvatarApiPath } from "~/bounded-contexts/clients/client-profile/public/paths";
import { AvatarField } from "~/bounded-contexts/clients/client-profile/ui/shared/avatar/avatar-field";
import { PreferenceRows } from "~/bounded-contexts/clients/client-profile/ui/shared/profile/preference-rows";
import { clientFullName } from "~/bounded-contexts/clients/clients/public/clients";
import { coachClientPath } from "~/bounded-contexts/clients/clients/public/paths";

import { ClientIdentitySection } from "./client-identity-section";
import { CoachingSection } from "./coaching-section";

type CoachClientProfileProps = {
  clientId: string;
  profile: ClientProfileView;
};

function PreferencesSection({ profile }: { profile: ClientProfileView }) {
  const { gender } = profile.identity;
  const subject = subjectPronoun(gender);
  const object = objectPronoun(gender);
  const possessive = possessivePronoun(gender);

  return (
    <SettingsSection
      data-parity-root="ClientPreferences"
      headingId="client-profile-preferences-heading"
      icon={CalendarCheck}
      title="Preferences"
    >
      <PreferenceRows
        copy={{
          channel: `Where ${subject.lower} want${subject.regularVerbSuffix} to hear from you.`,
          checkInDay: `The day that suits ${object} for check-ins.`,
          hint: `These come from ${possessive.lower} onboarding answers and stay as ${subject.lower} chose them.`,
        }}
        preferences={profile.preferences}
      />
    </SettingsSection>
  );
}

export function CoachClientProfile({
  clientId,
  profile,
}: CoachClientProfileProps) {
  const { identity } = profile;
  const name = clientFullName(identity);

  return (
    <div className="w-full max-w-3xl" data-parity-root="ClientProfilePage">
      <PortalBackLink to={coachClientPath(clientId)}>
        Back to {name}
      </PortalBackLink>
      <PortalPageHeader eyebrow={name} title="Profile" />
      <div className="space-y-6 sm:space-y-8">
        <AvatarField
          avatarEndpoint={coachClientAvatarApiPath(clientId)}
          avatarUrl={profile.avatarUrl}
          clientName={name}
          email={identity.email}
        />
        <ClientIdentitySection clientId={clientId} identity={identity} />
        <CoachingSection clientId={clientId} profile={profile} />
        {profile.coaching && <PreferencesSection profile={profile} />}
      </div>
    </div>
  );
}
