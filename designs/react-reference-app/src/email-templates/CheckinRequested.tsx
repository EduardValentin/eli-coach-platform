import { formatCallMoment } from '../app/utils/dateFormatters';
import {
  CheckinEmailButton,
  CheckinEmailLayout,
  type CheckinEmailDetail,
} from './_checkinEmailLayout';

export type CheckinRequestedProps = {
  clientName?: string;
  note?: string | null;
  startsAt?: Date;
  coachTimeZone?: string;
  reviewUrl?: string;
};

const DEFAULT_STARTS_AT = new Date('2026-10-12T14:00:00.000Z');

const EYEBROW = 'Check-in — new request';
const HEADING = 'A new check-in request.';
const SUBHEAD = 'Here is who asked and when.';
const BUTTON_LABEL = 'Review the request';
const FOOTER_LINE =
  'You received this email because a client asked for a check-in on the Evoa site.';

export function checkinRequestedSubject(clientName: string): string {
  return `${clientName} asked for a check-in`;
}

export function CheckinRequested({
  clientName = 'Jane Doe',
  note,
  startsAt = DEFAULT_STARTS_AT,
  coachTimeZone = 'Europe/Bucharest',
  reviewUrl = '/coach/checkins',
}: CheckinRequestedProps) {
  const details: CheckinEmailDetail[] = [
    { label: 'WHO', value: clientName },
    { label: 'WHEN', value: formatCallMoment(startsAt, coachTimeZone) },
  ];
  if (note && note.trim().length > 0) {
    details.push({ label: 'NOTE', value: note });
  }

  return (
    <CheckinEmailLayout
      subject={checkinRequestedSubject(clientName)}
      eyebrow={EYEBROW}
      heading={HEADING}
      subhead={SUBHEAD}
      details={details}
      footerLine={FOOTER_LINE}
    >
      <CheckinEmailButton href={reviewUrl} label={BUTTON_LABEL} />
    </CheckinEmailLayout>
  );
}

CheckinRequested.PreviewProps = {} satisfies CheckinRequestedProps;

export default CheckinRequested;
