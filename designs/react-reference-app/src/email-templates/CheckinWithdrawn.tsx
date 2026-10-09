import { formatCallMoment } from '../app/utils/dateFormatters';
import {
  CheckinEmailClosingLine,
  CheckinEmailLayout,
} from './_checkinEmailLayout';

export type CheckinWithdrawnProps = {
  clientName?: string;
  startsAt?: Date;
  coachTimeZone?: string;
};

const DEFAULT_STARTS_AT = new Date('2026-10-12T14:00:00.000Z');

const EYEBROW = 'Check-in — withdrawn';
const HEADING = 'A request was withdrawn.';
const CLOSING_LINE = 'That hour is free again.';
const FOOTER_LINE =
  'You received this email because a client withdrew a check-in request on the Evoa site.';

export function checkinWithdrawnSubject(clientName: string): string {
  return `${clientName} withdrew her check-in request`;
}

export function CheckinWithdrawn({
  clientName = 'Jane Doe',
  startsAt = DEFAULT_STARTS_AT,
  coachTimeZone = 'Europe/Bucharest',
}: CheckinWithdrawnProps) {
  return (
    <CheckinEmailLayout
      subject={checkinWithdrawnSubject(clientName)}
      eyebrow={EYEBROW}
      heading={HEADING}
      subhead={`${clientName} withdrew her check-in request.`}
      details={[
        { label: 'WHEN', value: formatCallMoment(startsAt, coachTimeZone) },
      ]}
      footerLine={FOOTER_LINE}
    >
      <CheckinEmailClosingLine>{CLOSING_LINE}</CheckinEmailClosingLine>
    </CheckinEmailLayout>
  );
}

CheckinWithdrawn.PreviewProps = {} satisfies CheckinWithdrawnProps;

export default CheckinWithdrawn;
