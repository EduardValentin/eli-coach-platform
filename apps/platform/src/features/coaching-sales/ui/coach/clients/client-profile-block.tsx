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
import { shortPricingTierLabel } from "~/features/coaching-sales/ui/coach/call-sales/pricing-tier-label";
import { useCalendarDayTimeZone } from "~/features/coaching-sales/ui/shared/calendar-day-format";

import { ABSENT_VALUE } from "./absent-value";

type ClientProfileBlockProps = {
  client: Pick<CoachClient, "profile" | "subscription">;
};

function PhoneLink({ phone }: { phone: string | null }) {
  if (!phone) {
    return <>{ABSENT_VALUE}</>;
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
          value={
            subscription
              ? shortPricingTierLabel(subscription.tier)
              : ABSENT_VALUE
          }
          valueParity="profile-tier"
        />
        <Reading
          as="dl-item"
          className="col-span-full"
          label="Booking notes"
          value={profile.bookingNotes ?? ABSENT_VALUE}
          valueParity="profile-notes"
        />
      </dl>
    </PortalWidget>
  );
}
