import { formatCallMoment } from '../app/utils/dateFormatters';
import {
  CheckinEmailButton,
  CheckinEmailCalendarOffer,
  CheckinEmailClosingLine,
  CheckinEmailLayout,
} from './_checkinEmailLayout';

export type CheckinApprovedProps = {
  coachName?: string;
  startsAt?: Date;
  clientTimeZone?: string;
  joinUrl?: string;
  googleCalendarUrl?: string;
};

const DEFAULT_STARTS_AT = new Date('2026-10-12T14:00:00.000Z');

const SUBJECT = 'Your check-in is approved';
const EYEBROW = 'Check-in — approved';
const HEADING = 'Your check-in is approved.';
const BUTTON_LABEL = 'Join Meet';
const CLOSING_LINE =
  'Use the button to join when it is time.';
const FOOTER_LINE =
  'You received this email because your coach approved a check-in you asked for on the Evoa site.';

export function CheckinApproved({
  coachName = 'Eli',
  startsAt = DEFAULT_STARTS_AT,
  clientTimeZone = 'Europe/London',
  joinUrl = '/client/checkins/ci-demo/join',
  googleCalendarUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Check-in+with+Eli',
}: CheckinApprovedProps) {
  return (
    <CheckinEmailLayout
      subject={SUBJECT}
      eyebrow={EYEBROW}
      heading={HEADING}
      subhead={`${coachName} approved your check-in.`}
      details={[
        { label: 'WHEN', value: formatCallMoment(startsAt, clientTimeZone) },
      ]}
      footerLine={FOOTER_LINE}
    >
      <CheckinEmailButton href={joinUrl} label={BUTTON_LABEL}>
        <CheckinEmailCalendarOffer googleCalendarUrl={googleCalendarUrl} />
      </CheckinEmailButton>
      <CheckinEmailClosingLine>{CLOSING_LINE}</CheckinEmailClosingLine>
    </CheckinEmailLayout>
  );
}

CheckinApproved.PreviewProps = {} satisfies CheckinApprovedProps;

export default CheckinApproved;
