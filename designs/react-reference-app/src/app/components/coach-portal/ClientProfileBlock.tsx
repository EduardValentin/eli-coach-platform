import { UserRound } from 'lucide-react';
import type { ClientJourney } from '../../domain/journey';
import { formatAgeForCard } from '../../services/visitorProfile';
import { clientDetailPathForJourney, journeyGenderLabel } from '../../utils/journeyLabels';
import { PortalWidget } from '../PortalWidget';
import { Reading } from '../Reading';
import { WidgetLink } from '../WidgetLink';
import { ABSENT_VALUE } from '../constants';
import { PhoneLink } from './PhoneLink';

export function ClientProfileBlock({ journey }: { journey: ClientJourney }) {
  const { identity } = journey.profile;

  return (
    <PortalWidget
      presentation="coach"
      title="Profile"
      icon={UserRound}
      headingId="profile-panel-heading"
      parityRoot="ClientProfileBlock"
      className="mb-8"
      footer={
        <WidgetLink trailing="arrow" to={`${clientDetailPathForJourney(journey)}/profile`} data-parity="view-profile">
          View profile
        </WidgetLink>
      }
    >
      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Reading
          as="dl-item"
          label="Age"
          value={formatAgeForCard(identity.dateOfBirth, new Date())}
          valueParity="profile-age"
        />
        <Reading as="dl-item" label="Gender" value={journeyGenderLabel(identity.gender)} valueParity="profile-gender" />
        <Reading as="dl-item" label="Country" value={identity.country || ABSENT_VALUE} valueParity="profile-country" />
        <Reading as="dl-item" label="Phone" value={<PhoneLink phone={identity.phone} />} valueParity="profile-phone" />
        <Reading
          as="dl-item"
          label="Email"
          value={identity.email}
          valueParity="profile-email"
          className="col-span-full"
        />
      </dl>
    </PortalWidget>
  );
}
