import { formatCallMoment } from '../app/utils/dateFormatters';
import {
  CheckinEmailClosingLine,
  CheckinEmailLayout,
} from './_checkinEmailLayout';

export type CheckinScheduleCancelledProps = {
  coachName?: string;
  startsAt?: Date;
  clientTimeZone?: string;
};

const DEFAULT_STARTS_AT = new Date('2026-10-12T14:00:00.000Z');

const EYEBROW = 'Check-in — cancelled';
const HEADING = 'A request was cancelled.';
const CLOSING_LINE = 'No check-in is planned for that hour.';
const FOOTER_LINE =
  'You received this email because your coach cancelled a check-in request on the Evoa site.';

export function checkinScheduleCancelledSubject(coachName: string): string {
  return `${coachName} cancelled the check-in request`;
}

export function CheckinScheduleCancelled({
  coachName = 'Eli',
  startsAt = DEFAULT_STARTS_AT,
  clientTimeZone = 'Europe/London',
}: CheckinScheduleCancelledProps) {
  return (
    <CheckinEmailLayout
      subject={checkinScheduleCancelledSubject(coachName)}
      eyebrow={EYEBROW}
      heading={HEADING}
      subhead={`${coachName} cancelled the check-in request.`}
      details={[
        { label: 'WHEN', value: formatCallMoment(startsAt, clientTimeZone) },
      ]}
      footerLine={FOOTER_LINE}
    >
      <CheckinEmailClosingLine>{CLOSING_LINE}</CheckinEmailClosingLine>
    </CheckinEmailLayout>
  );
}

CheckinScheduleCancelled.PreviewProps = {} satisfies CheckinScheduleCancelledProps;

export default CheckinScheduleCancelled;
