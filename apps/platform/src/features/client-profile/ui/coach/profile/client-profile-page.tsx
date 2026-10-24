import {
  PortalBackLink,
  PortalPageHeader,
  SettingsSection,
} from "@eli-coach-platform/ui/portal";
import { CalendarCheck } from "lucide-react";

import {
  objectPronoun,
  possessivePronoun,
  subjectPronoun,
} from "~/features/assessment-calls/public/visitor-profile";
import type { ClientProfileView } from "~/features/client-profile/public/client-profile";
import { coachClientAvatarApiPath } from "~/features/client-profile/public/paths";
import { AvatarField } from "~/features/client-profile/ui/shared/avatar/avatar-field";
import { PreferenceRows } from "~/features/client-profile/ui/shared/profile/preference-rows";
import { clientFullName } from "~/features/clients/public/clients";
import { coachClientPath } from "~/features/clients/public/paths";

import { AboutHerSection } from "./about-her-section";
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
          action={coachClientAvatarApiPath(clientId)}
          avatarUrl={profile.avatarUrl}
          detail={identity.email}
          name={name}
        />
        <AboutHerSection clientId={clientId} identity={identity} />
        <CoachingSection
          clientId={clientId}
          key={identity.gender}
          profile={profile}
        />
        {profile.coaching && <PreferencesSection profile={profile} />}
      </div>
    </div>
  );
}
