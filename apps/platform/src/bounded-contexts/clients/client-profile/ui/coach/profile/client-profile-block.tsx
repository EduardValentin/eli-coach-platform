import { PhoneLink, useCalendarDayTimeZone } from "~/shared/design-system/lib";
import {
  PortalWidget,
  Reading,
  WidgetLink,
} from "~/shared/design-system/portal";
import { UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";

import { findCountry } from "~/bounded-contexts/scheduling/assessment-calls/public/countries";
import {
  formatAgeForCard,
  labelForGender,
} from "~/bounded-contexts/scheduling/assessment-calls/public/visitor-profile";
import type { ClientProfileView } from "~/bounded-contexts/clients/client-profile/public/client-profile";
import { coachClientProfilePath } from "~/bounded-contexts/clients/clients/public/paths";

type ClientProfileBlockProps = {
  clientId: string;
  profile: ClientProfileView;
};

type ProfileReadingId = "age" | "gender" | "country" | "phone";

type ProfileReading = {
  id: ProfileReadingId;
  label: string;
  parity: string;
};

const PROFILE_READINGS: readonly ProfileReading[] = [
  { id: "age", label: "Age", parity: "profile-age" },
  { id: "gender", label: "Gender", parity: "profile-gender" },
  { id: "country", label: "Country", parity: "profile-country" },
  { id: "phone", label: "Phone", parity: "profile-phone" },
];

export function ClientProfileBlock({
  clientId,
  profile,
}: ClientProfileBlockProps) {
  const timeZone = useCalendarDayTimeZone();
  const [now] = useState(() => new Date());
  const { identity } = profile;
  const values: Record<ProfileReadingId, ReactNode> = {
    age: formatAgeForCard({
      dateOfBirth: identity.dateOfBirth,
      on: now,
      timeZone,
    }),
    gender: labelForGender(identity.gender),
    country: findCountry(identity.country)?.name ?? identity.country,
    phone: <PhoneLink phone={identity.phone} />,
  };

  return (
    <PortalWidget
      data-parity-root="ClientProfileBlock"
      className="mb-8"
      footer={
        <WidgetLink
          data-parity="view-profile"
          to={coachClientProfilePath(clientId)}
          trailing="arrow"
        >
          View profile
        </WidgetLink>
      }
      headingId="profile-panel-heading"
      icon={UserRound}
      title="Profile"
    >
      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {PROFILE_READINGS.map((reading) => (
          <Reading
            key={reading.id}
            as="dl-item"
            label={reading.label}
            value={values[reading.id]}
            valueParity={reading.parity}
          />
        ))}
        <Reading
          as="dl-item"
          className="col-span-full"
          label="Email"
          value={identity.email}
          valueParity="profile-email"
        />
      </dl>
    </PortalWidget>
  );
}
