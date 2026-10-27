import { COACH_DISPLAY_NAME } from "@eli-coach-platform/content";

import {
  CheckInEmailActionSection,
  CheckInEmailCalendarOffer,
  checkInEmailCalendarOfferLines,
  CheckInEmailClosingLine,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";

export type CheckInApprovedEmailProps = {
  when: string;
  joinUrl: string;
  googleCalendarUrl: string;
  currentYear: number;
};

const SUBJECT = "Your check-in is approved";
const BUTTON_LABEL = "Join Meet";
const CLOSING_LINE = "Use the button to join when it is time.";

export function checkInApprovedSubject(): string {
  return SUBJECT;
}

export function CheckInApprovedEmail(props: CheckInApprovedEmailProps) {
  return (
    <CheckInEmailLayout content={contentOf(props)}>
      <CheckInEmailActionSection href={props.joinUrl} label={BUTTON_LABEL}>
        <CheckInEmailCalendarOffer
          googleCalendarUrl={props.googleCalendarUrl}
        />
      </CheckInEmailActionSection>
      <CheckInEmailClosingLine>{CLOSING_LINE}</CheckInEmailClosingLine>
    </CheckInEmailLayout>
  );
}

export function checkInApprovedText(props: CheckInApprovedEmailProps): string {
  return checkInEmailText(contentOf(props), {
    actionLines: [
      `${BUTTON_LABEL}: ${props.joinUrl}`,
      ...checkInEmailCalendarOfferLines(props.googleCalendarUrl),
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
