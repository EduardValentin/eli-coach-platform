import type { CSSProperties } from 'react';
import { formatCallMoment } from '../app/utils/dateFormatters';
import {
  CheckinEmailButton,
  CheckinEmailClosingLine,
  CheckinEmailLayout,
} from './_checkinEmailLayout';
import {
  EMAIL_BRAND as BRAND,
  EMAIL_FONT_SANS as FONT_SANS,
  EmailLink,
  EmailText,
} from './_primitives';

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
const CALENDAR_LABEL = 'Add to Google Calendar';
const ATTACHMENT_LINE =
  'A calendar file is attached to this email, so you can add the check-in to any calendar you use.';
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
        <EmailText style={calendarLineStyle}>
          <EmailLink href={googleCalendarUrl} style={calendarLinkStyle}>
            {CALENDAR_LABEL}
          </EmailLink>
        </EmailText>
        <EmailText style={attachmentLineStyle}>{ATTACHMENT_LINE}</EmailText>
      </CheckinEmailButton>
      <CheckinEmailClosingLine>{CLOSING_LINE}</CheckinEmailClosingLine>
    </CheckinEmailLayout>
  );
}

CheckinApproved.PreviewProps = {} satisfies CheckinApprovedProps;

export default CheckinApproved;

const calendarLineStyle: CSSProperties = {
  margin: '18px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '14px',
  lineHeight: 1.55,
  fontWeight: 500,
};

const calendarLinkStyle: CSSProperties = {
  color: BRAND.pink,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
};

const attachmentLineStyle: CSSProperties = {
  margin: '12px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '13px',
  lineHeight: 1.55,
  color: BRAND.muted,
  fontWeight: 400,
};
