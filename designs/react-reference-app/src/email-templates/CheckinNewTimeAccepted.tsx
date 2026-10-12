import { formatCallMoment } from '../app/utils/dateFormatters';
import {
  CheckinEmailButton,
  CheckinEmailCalendarOffer,
  CheckinEmailClosingLine,
  CheckinEmailLayout,
} from './_checkinEmailLayout';

export type CheckinNewTimeAcceptedProps = {
  who?: string;
  startsAt?: Date;
  timeZone?: string;
  joinUrl?: string;
  googleCalendarUrl?: string;
};

const DEFAULT_STARTS_AT = new Date('2026-10-12T14:00:00.000Z');

const EYEBROW = 'Check-in — new time accepted';
const HEADING = 'The new time is set.';
const SUBHEAD = 'Here is who accepted it and when.';
const BUTTON_LABEL = 'Join the check-in';
const CLOSING_LINE = 'Use the button to join when it is time.';
const FOOTER_LINE =
  'You received this email because a new time you proposed for a check-in was accepted on the Evoa site.';

export function checkinNewTimeAcceptedSubject(who: string): string {
  return `${who} accepted the new time`;
}

export function CheckinNewTimeAccepted({
  who = 'Jane Doe',
  startsAt = DEFAULT_STARTS_AT,
  timeZone = 'Europe/Bucharest',
  joinUrl = '/coach/checkins/ci-demo/join',
  googleCalendarUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Check-in+with+Jane+Doe',
}: CheckinNewTimeAcceptedProps) {
  return (
    <CheckinEmailLayout
      subject={checkinNewTimeAcceptedSubject(who)}
      eyebrow={EYEBROW}
      heading={HEADING}
      subhead={SUBHEAD}
      details={[
        { label: 'WHO', value: who },
        { label: 'WHEN', value: formatCallMoment(startsAt, timeZone) },
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

CheckinNewTimeAccepted.PreviewProps = {} satisfies CheckinNewTimeAcceptedProps;

export default CheckinNewTimeAccepted;
