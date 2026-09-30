import { Video } from 'lucide-react';
import type { ClientJourney } from '../../domain/journey';
import { labelForPrimaryGoal } from '../../services/visitorProfile';
import {
  browserTimeZone,
  formatShortDay,
  formatSlotTime,
} from '../../utils/dateFormatters';
import { REDUCED_PRICE_LABELS } from '../../utils/journeyLabels';
import { PortalWidget } from '../PortalWidget';
import { Reading } from '../Reading';
import { ABSENT_VALUE } from './absentValue';

function shortCallMoment(startsAt: Date): string {
  const timeZone = browserTimeZone();

  return `${formatShortDay(startsAt, timeZone)} · ${formatSlotTime(startsAt, timeZone)}`;
}

export function AssessmentCallBlock({ journey }: { journey: ClientJourney }) {
  const { primaryGoal } = journey.identity;

  return (
    <PortalWidget
      presentation="coach"
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
          label="Primary goal"
          value={primaryGoal ? labelForPrimaryGoal(primaryGoal) : ABSENT_VALUE}
          valueParity="call-goal"
        />
        <Reading
          as="dl-item"
          label="Reduced price"
          value={REDUCED_PRICE_LABELS[journey.pricing]}
          valueParity="call-reduced-price"
        />
        <Reading
          as="dl-item"
          label="Booking notes"
          value={journey.bookingNotes ?? ABSENT_VALUE}
          valueParity="call-notes"
          className="col-span-full"
        />
      </dl>
    </PortalWidget>
  );
}
