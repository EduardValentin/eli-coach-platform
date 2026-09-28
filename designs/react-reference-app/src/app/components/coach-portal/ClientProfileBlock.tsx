import { UserRound } from 'lucide-react';
import type { ClientJourney, JourneyPhone } from '../../domain/journey';
import { ageOn, labelForPrimaryGoal } from '../../services/visitorProfile';
import { GENDER_LABELS, PRICING_TIER_LABELS } from '../../utils/journeyLabels';
import { PortalWidget } from '../PortalWidget';
import { Reading } from '../Reading';

const ABSENT = '—';

function PhoneLink({ phone }: { phone: JourneyPhone | undefined }) {
  if (!phone) return <>{ABSENT}</>;

  const dialled = `${phone.diallingCode}${phone.number}`;

  return (
    <a href={`tel:${dialled}`} className="hover:underline">
      {dialled}
    </a>
  );
}

export function ClientProfileBlock({ journey }: { journey: ClientJourney }) {
  const { identity } = journey;

  return (
    <PortalWidget
      presentation="coach"
      title="Profile"
      icon={
        <UserRound
          aria-hidden="true"
          className="text-brand-secondary"
          size={18}
        />
      }
      headingId="profile-panel-heading"
      parityRoot="ClientProfileBlock"
      className="mb-8"
    >
      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
        <Reading
          as="dl-item"
          label="Age"
          value={ageOn(identity.dateOfBirth, new Date())}
          valueParity="profile-age"
        />
        <Reading
          as="dl-item"
          label="Gender"
          value={GENDER_LABELS[identity.gender]}
          valueParity="profile-gender"
        />
        <Reading
          as="dl-item"
          label="Country"
          value={identity.country || ABSENT}
          valueParity="profile-country"
        />
        <Reading
          as="dl-item"
          label="Phone"
          value={<PhoneLink phone={identity.phone} />}
          valueParity="profile-phone"
        />
        <Reading
          as="dl-item"
          label="Primary goal"
          value={
            identity.primaryGoal
              ? labelForPrimaryGoal(identity.primaryGoal)
              : ABSENT
          }
          valueParity="profile-goal"
        />
        <Reading
          as="dl-item"
          label="Pricing tier"
          value={PRICING_TIER_LABELS[journey.pricing]}
          valueParity="profile-tier"
        />
        <Reading
          as="dl-item"
          label="Booking notes"
          value={journey.bookingNotes ?? ABSENT}
          valueParity="profile-notes"
          className="col-span-full"
        />
      </dl>
    </PortalWidget>
  );
}
