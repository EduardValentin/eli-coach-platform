import { formatCallMoment } from '../app/utils/dateFormatters';
import {
  CheckinEmailButton,
  CheckinEmailCalendarOffer,
  CheckinEmailClosingLine,
  CheckinEmailLayout,
} from './_checkinEmailLayout';

export type CheckinApprovedByClientProps = {
  clientName?: string;
  startsAt?: Date;
  coachTimeZone?: string;
  joinUrl?: string;
  googleCalendarUrl?: string;
};

const DEFAULT_STARTS_AT = new Date('2026-10-12T14:00:00.000Z');

const EYEBROW = 'Check-in — approved';
const HEADING = 'Your check-in is approved.';
const SUBHEAD = 'Here is who approved it and when.';
const BUTTON_LABEL = 'Join Meet';
const CLOSING_LINE = 'Use the button to join when it is time.';
const FOOTER_LINE =
  'You received this email because a client answered a check-in you scheduled on the Evoa site.';

export function checkinApprovedByClientSubject(clientName: string): string {
  return `${clientName} approved the check-in`;
}

export function CheckinApprovedByClient({
  clientName = 'Jane Doe',
  startsAt = DEFAULT_STARTS_AT,
  coachTimeZone = 'Europe/Bucharest',
  joinUrl = '/coach/checkins/ci-demo/join',
  googleCalendarUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Check-in+with+Jane+Doe',
}: CheckinApprovedByClientProps) {
  return (
    <CheckinEmailLayout
      subject={checkinApprovedByClientSubject(clientName)}
      eyebrow={EYEBROW}
      heading={HEADING}
      subhead={SUBHEAD}
      details={[
        { label: 'WHO', value: clientName },
        { label: 'WHEN', value: formatCallMoment(startsAt, coachTimeZone) },
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

CheckinApprovedByClient.PreviewProps = {} satisfies CheckinApprovedByClientProps;

export default CheckinApprovedByClient;
