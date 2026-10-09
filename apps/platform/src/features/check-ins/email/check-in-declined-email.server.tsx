import { COACH_DISPLAY_NAME } from "@eli-coach-platform/content";

import {
  CheckInEmailButton,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";

export type CheckInDeclinedEmailProps = {
  when: string;
  checkInsUrl: string;
  currentYear: number;
};

const SUBJECT = `${COACH_DISPLAY_NAME} could not make your check-in time`;
const BUTTON_LABEL = "Pick another time";

export function checkInDeclinedSubject(): string {
  return SUBJECT;
}

export function CheckInDeclinedEmail(props: CheckInDeclinedEmailProps) {
  return (
    <CheckInEmailLayout content={contentOf(props)}>
      <CheckInEmailButton href={props.checkInsUrl} label={BUTTON_LABEL} />
    </CheckInEmailLayout>
  );
}

export function checkInDeclinedText(props: CheckInDeclinedEmailProps): string {
  return checkInEmailText(contentOf(props), {
    actionLines: [`${BUTTON_LABEL}: ${props.checkInsUrl}`],
  });
}

function contentOf(props: CheckInDeclinedEmailProps): CheckInEmailContent {
  return {
    subject: SUBJECT,
    eyebrow: "Check-in — declined",
    heading: `${COACH_DISPLAY_NAME} could not make that time.`,
    subhead: "You can pick another time on your Check-ins page.",
    details: [{ label: "YOU ASKED FOR", value: props.when }],
    footerLine:
      "You received this email because your coach answered a check-in you asked for on the Evoa site.",
    currentYear: props.currentYear,
  };
}
