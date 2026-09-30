import { UserRound } from 'lucide-react';
import type { ClientJourney, JourneyPhone } from '../../domain/journey';
import { ageOn } from '../../services/visitorProfile';
import { journeyGenderLabel } from '../../utils/journeyLabels';
import { PortalWidget } from '../PortalWidget';
import { Reading } from '../Reading';
import { ABSENT_VALUE } from './absentValue';

function PhoneLink({ phone }: { phone: JourneyPhone | undefined }) {
  if (!phone) return <>{ABSENT_VALUE}</>;

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
      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Reading
          as="dl-item"
          label="Age"
          value={ageOn(identity.dateOfBirth, new Date())}
          valueParity="profile-age"
        />
        <Reading
          as="dl-item"
          label="Gender"
          value={journeyGenderLabel(identity.gender)}
          valueParity="profile-gender"
        />
        <Reading
          as="dl-item"
          label="Country"
          value={identity.country || ABSENT_VALUE}
          valueParity="profile-country"
        />
        <Reading
          as="dl-item"
          label="Phone"
          value={<PhoneLink phone={identity.phone} />}
          valueParity="profile-phone"
        />
      </dl>
    </PortalWidget>
  );
}
