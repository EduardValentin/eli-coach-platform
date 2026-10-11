import { formatCallMoment } from '../app/utils/dateFormatters';
import {
  CheckinEmailClosingLine,
  CheckinEmailLayout,
} from './_checkinEmailLayout';

export type CheckinCancelledProps = {
  who?: string;
  startsAt?: Date;
  timeZone?: string;
};

const DEFAULT_STARTS_AT = new Date('2026-10-12T14:00:00.000Z');

const EYEBROW = 'Check-in — cancelled';
const HEADING = 'A check-in was cancelled.';
const SUBHEAD = 'Here is who cancelled it and when.';
const CLOSING_LINE = 'That hour is free again.';
const FOOTER_LINE =
  'You received this email because a check-in you had planned was cancelled on the Evoa site.';

export function checkinCancelledSubject(who: string): string {
  return `${who} cancelled the check-in`;
}

export function CheckinCancelled({
  who = 'Eli',
  startsAt = DEFAULT_STARTS_AT,
  timeZone = 'Europe/London',
}: CheckinCancelledProps) {
  return (
    <CheckinEmailLayout
      subject={checkinCancelledSubject(who)}
      eyebrow={EYEBROW}
      heading={HEADING}
      subhead={SUBHEAD}
      details={[
        { label: 'WHO', value: who },
        { label: 'WHEN', value: formatCallMoment(startsAt, timeZone) },
      ]}
      footerLine={FOOTER_LINE}
    >
      <CheckinEmailClosingLine>{CLOSING_LINE}</CheckinEmailClosingLine>
    </CheckinEmailLayout>
  );
}

CheckinCancelled.PreviewProps = {} satisfies CheckinCancelledProps;

export default CheckinCancelled;
