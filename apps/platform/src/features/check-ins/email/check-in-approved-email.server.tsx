import { COACH_DISPLAY_NAME } from "@eli-coach-platform/content";
import {
  EmailLink,
  EmailText,
} from "@eli-coach-platform/infrastructure/email/server";

import {
  CheckInEmailButton,
  CheckInEmailClosingLine,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";
import {
  attachmentLineStyle,
  calendarLineStyle,
  calendarLinkStyle,
} from "./check-in-email-styles.server";

export type CheckInApprovedEmailProps = {
  when: string;
  joinUrl: string;
  googleCalendarUrl: string;
  currentYear: number;
};

const SUBJECT = "Your check-in is approved";
const BUTTON_LABEL = "Join Meet";
const CALENDAR_LABEL = "Add to Google Calendar";
const ATTACHMENT_LINE =
  "A calendar file is attached to this email, so you can add the check-in to any calendar you use.";
const CLOSING_LINE = "Use the button to join when it is time.";

export function checkInApprovedSubject(): string {
  return SUBJECT;
}

export function CheckInApprovedEmail(props: CheckInApprovedEmailProps) {
  return (
    <CheckInEmailLayout content={contentOf(props)}>
      <CheckInEmailButton href={props.joinUrl} label={BUTTON_LABEL}>
        <EmailText style={calendarLineStyle}>
          <EmailLink href={props.googleCalendarUrl} style={calendarLinkStyle}>
            {CALENDAR_LABEL}
          </EmailLink>
        </EmailText>
        <EmailText style={attachmentLineStyle}>{ATTACHMENT_LINE}</EmailText>
      </CheckInEmailButton>
      <CheckInEmailClosingLine>{CLOSING_LINE}</CheckInEmailClosingLine>
    </CheckInEmailLayout>
  );
}

export function checkInApprovedText(props: CheckInApprovedEmailProps): string {
  return checkInEmailText(contentOf(props), {
    actionLines: [
      `${BUTTON_LABEL}: ${props.joinUrl}`,
      `${CALENDAR_LABEL}: ${props.googleCalendarUrl}`,
      ATTACHMENT_LINE,
    ],
    closingLine: CLOSING_LINE,
  });
}

function contentOf(props: CheckInApprovedEmailProps): CheckInEmailContent {
  return {
    subject: SUBJECT,
    eyebrow: "Check-in — approved",
    heading: "Your check-in is approved.",
    subhead: `${COACH_DISPLAY_NAME} approved your check-in.`,
    details: [{ label: "WHEN", value: props.when }],
    footerLine:
      "You received this email because your coach approved a check-in you asked for on the Evoa site.",
    currentYear: props.currentYear,
  };
}
