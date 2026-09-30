import { Video } from 'lucide-react';
import type { ClientJourney } from '../../domain/journey';
import {
  formatBirthDate,
  labelForPrimaryGoal,
} from '../../services/visitorProfile';
import {
  browserTimeZone,
  formatShortDay,
  formatSlotTime,
} from '../../utils/dateFormatters';
import { journeyGenderLabel } from '../../utils/journeyLabels';
import { CollapsiblePortalWidget } from '../CollapsiblePortalWidget';
import { Reading } from '../Reading';
import { ABSENT_VALUE } from '../constants';
import { PhoneLink } from './PhoneLink';

function shortCallMoment(startsAt: Date): string {
  const timeZone = browserTimeZone();

  return `${formatShortDay(startsAt, timeZone)} · ${formatSlotTime(startsAt, timeZone)}`;
}

export function AssessmentCallBlock({ journey }: { journey: ClientJourney }) {
  const { identity } = journey;

  return (
    <CollapsiblePortalWidget
      title="Assessment call"
      icon={
        <Video aria-hidden="true" className="text-brand-secondary" size={18} />
      }
      headingId="assessment-call-panel-heading"
      parityRoot="AssessmentCallBlock"
      className="mb-8"
    >
      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Reading
          as="dl-item"
          label="Call"
          value={shortCallMoment(journey.callStartsAt)}
          valueParity="call-date"
          className="col-span-full sm:col-span-1"
        />
        <Reading
          as="dl-item"
          label="Name"
          value={`${identity.firstName} ${identity.lastName}`.trim()}
          valueParity="call-name"
        />
        <Reading
          as="dl-item"
          label="Email"
          value={identity.email}
          valueParity="call-email"
        />
        <Reading
          as="dl-item"
          label="Date of birth"
          value={formatBirthDate(identity.dateOfBirth)}
          valueParity="call-dob"
        />
        <Reading
          as="dl-item"
          label="Gender"
          value={journeyGenderLabel(identity.gender)}
          valueParity="call-gender"
        />
        <Reading
          as="dl-item"
          label="Country"
          value={identity.country || ABSENT_VALUE}
          valueParity="call-country"
        />
        <Reading
          as="dl-item"
          label="Phone"
          value={<PhoneLink phone={identity.phone} />}
          valueParity="call-phone"
        />
        <Reading
          as="dl-item"
          label="Primary goal"
          value={
            identity.primaryGoal
              ? labelForPrimaryGoal(identity.primaryGoal)
              : ABSENT_VALUE
          }
          valueParity="call-goal"
        />
        <Reading
          as="dl-item"
          label="Booking notes"
          value={journey.bookingNotes ?? ABSENT_VALUE}
          valueParity="call-notes"
          className="col-span-full"
        />
      </dl>
    </CollapsiblePortalWidget>
  );
}
