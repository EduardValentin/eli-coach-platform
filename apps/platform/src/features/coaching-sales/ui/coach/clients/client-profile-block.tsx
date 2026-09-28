import { PortalWidget, Reading } from "@eli-coach-platform/ui/portal";
import { UserRound } from "lucide-react";
import { useState } from "react";

import { findCountry } from "~/features/assessment-calls/contracts/countries";
import {
  ageOn,
  labelForGender,
  labelForPrimaryGoal,
} from "~/features/assessment-calls/contracts/visitor-profile";
import type { CoachClient } from "~/features/coaching-sales/contracts/coach-clients";
import type { PriceTier } from "~/features/coaching-sales/contracts/coaching-sales";
import { useCalendarDayTimeZone } from "~/features/coaching-sales/ui/shared/calendar-day-format";

const ABSENT = "—";

const PRICING_TIER_LABELS: Readonly<Record<PriceTier, string>> = {
  reduced: "Reduced",
  regular: "Regular",
};

type ClientProfileBlockProps = {
  client: Pick<CoachClient, "profile" | "subscription">;
};

function PhoneLink({ phone }: { phone: string | null }) {
  if (!phone) {
    return <>{ABSENT}</>;
  }

  return (
    <a className="hover:underline" href={`tel:${phone}`}>
      {phone}
    </a>
  );
}

export function ClientProfileBlock({ client }: ClientProfileBlockProps) {
  const { profile, subscription } = client;
  const timeZone = useCalendarDayTimeZone();
  const [now] = useState(() => new Date());

  return (
    <PortalWidget
      data-parity-root="ClientProfileBlock"
      className="mb-8"
      headingId="profile-panel-heading"
      icon={
        <UserRound
          aria-hidden="true"
          className="text-brand-secondary"
          size={18}
        />
      }
      title="Profile"
    >
      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
        <Reading
          as="dl-item"
          label="Age"
          value={ageOn({
            dateOfBirth: profile.dateOfBirth,
            on: now,
            timeZone,
          })}
          valueParity="profile-age"
        />
        <Reading
          as="dl-item"
          label="Gender"
          value={labelForGender(profile.gender)}
          valueParity="profile-gender"
        />
        <Reading
          as="dl-item"
          label="Country"
          value={findCountry(profile.country)?.name ?? profile.country}
          valueParity="profile-country"
        />
        <Reading
          as="dl-item"
          label="Phone"
          value={<PhoneLink phone={profile.phone} />}
          valueParity="profile-phone"
        />
        <Reading
          as="dl-item"
          label="Primary goal"
          value={labelForPrimaryGoal(profile.primaryGoal)}
          valueParity="profile-goal"
        />
        <Reading
          as="dl-item"
          label="Pricing tier"
          value={subscription ? PRICING_TIER_LABELS[subscription.tier] : ABSENT}
          valueParity="profile-tier"
        />
        <Reading
          as="dl-item"
          className="col-span-full"
          label="Booking notes"
          value={profile.bookingNotes ?? ABSENT}
          valueParity="profile-notes"
        />
      </dl>
    </PortalWidget>
  );
}
