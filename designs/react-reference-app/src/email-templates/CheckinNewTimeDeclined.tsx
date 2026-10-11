import { formatCallMoment } from '../app/utils/dateFormatters';
import {
  CheckinEmailClosingLine,
  CheckinEmailLayout,
} from './_checkinEmailLayout';

export type CheckinNewTimeDeclinedProps = {
  who?: string;
  startsAt?: Date;
  timeZone?: string;
};

const DEFAULT_STARTS_AT = new Date('2026-10-12T14:00:00.000Z');

const EYEBROW = 'Check-in — new time declined';
const HEADING = 'The new time was declined.';
const SUBHEAD = 'Here is who declined it. The check-in is cancelled.';
const CLOSING_LINE = 'That hour is free again.';
const FOOTER_LINE =
  'You received this email because a new time you proposed for a check-in was declined on the Evoa site.';

export function checkinNewTimeDeclinedSubject(who: string): string {
  return `${who} declined the new time`;
}

export function CheckinNewTimeDeclined({
  who = 'Eli',
  startsAt = DEFAULT_STARTS_AT,
  timeZone = 'Europe/London',
}: CheckinNewTimeDeclinedProps) {
  return (
    <CheckinEmailLayout
      subject={checkinNewTimeDeclinedSubject(who)}
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

CheckinNewTimeDeclined.PreviewProps = {} satisfies CheckinNewTimeDeclinedProps;

export default CheckinNewTimeDeclined;
