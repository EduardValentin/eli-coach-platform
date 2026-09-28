import { PortalWidget } from "@eli-coach-platform/ui/portal";
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

import { ABSENT_READING, ClientReading } from "./client-reading";

const PRICING_TIER_LABELS: Readonly<Record<PriceTier, string>> = {
  reduced: "Reduced",
  regular: "Regular",
};

type ClientProfileBlockProps = {
  client: Pick<CoachClient, "profile" | "subscription">;
};

function PhoneLink({ phone }: { phone: string | null }) {
  if (!phone) {
    return <>{ABSENT_READING}</>;
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
    <div data-parity-root="ClientProfileBlock">
      <PortalWidget
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
          <ClientReading
            label="Age"
            value={ageOn({
              dateOfBirth: profile.dateOfBirth,
              on: now,
              timeZone,
            })}
            valueParity="profile-age"
          />
          <ClientReading
            label="Gender"
            value={labelForGender(profile.gender)}
            valueParity="profile-gender"
          />
          <ClientReading
            label="Country"
            value={findCountry(profile.country)?.name ?? profile.country}
            valueParity="profile-country"
          />
          <ClientReading
            label="Phone"
            value={<PhoneLink phone={profile.phone} />}
            valueParity="profile-phone"
          />
          <ClientReading
            label="Primary goal"
            value={labelForPrimaryGoal(profile.primaryGoal)}
            valueParity="profile-goal"
          />
          <ClientReading
            label="Pricing tier"
            value={
              subscription
                ? PRICING_TIER_LABELS[subscription.tier]
                : ABSENT_READING
            }
            valueParity="profile-tier"
          />
          <ClientReading
            className="col-span-full"
            label="Booking notes"
            value={profile.bookingNotes ?? ABSENT_READING}
            valueParity="profile-notes"
          />
        </dl>
      </PortalWidget>
    </div>
  );
}
