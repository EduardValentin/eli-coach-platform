import { formatCallMoment } from '../app/utils/dateFormatters';
import {
  CheckinEmailClosingLine,
  CheckinEmailLayout,
} from './_checkinEmailLayout';

export type CheckinDeclinedByClientProps = {
  clientName?: string;
  startsAt?: Date;
  coachTimeZone?: string;
};

const DEFAULT_STARTS_AT = new Date('2026-10-12T14:00:00.000Z');

const EYEBROW = 'Check-in — declined';
const HEADING = 'Your check-in was declined.';
const SUBHEAD = 'Here is who declined and when.';
const CLOSING_LINE = 'That hour is free again.';
const FOOTER_LINE =
  'You received this email because a client answered a check-in you scheduled on the Evoa site.';

export function checkinDeclinedByClientSubject(clientName: string): string {
  return `${clientName} declined the check-in`;
}

export function CheckinDeclinedByClient({
  clientName = 'Jane Doe',
  startsAt = DEFAULT_STARTS_AT,
  coachTimeZone = 'Europe/Bucharest',
}: CheckinDeclinedByClientProps) {
  return (
    <CheckinEmailLayout
      subject={checkinDeclinedByClientSubject(clientName)}
      eyebrow={EYEBROW}
      heading={HEADING}
      subhead={SUBHEAD}
      details={[
        { label: 'WHO', value: clientName },
        { label: 'WHEN', value: formatCallMoment(startsAt, coachTimeZone) },
      ]}
      footerLine={FOOTER_LINE}
    >
      <CheckinEmailClosingLine>{CLOSING_LINE}</CheckinEmailClosingLine>
    </CheckinEmailLayout>
  );
}

CheckinDeclinedByClient.PreviewProps = {} satisfies CheckinDeclinedByClientProps;

export default CheckinDeclinedByClient;
