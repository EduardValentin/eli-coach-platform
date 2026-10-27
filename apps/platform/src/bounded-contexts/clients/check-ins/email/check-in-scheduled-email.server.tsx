import { COACH_DISPLAY_NAME } from "@eli-coach-platform/content";

import {
  CheckInEmailActionSection,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";

export type CheckInScheduledEmailProps = {
  note: string | null;
  when: string;
  checkInsUrl: string;
  currentYear: number;
};

const SUBJECT = `${COACH_DISPLAY_NAME} scheduled a check-in with you`;
const BUTTON_LABEL = "Answer the request";

export function checkInScheduledSubject(): string {
  return SUBJECT;
}

export function CheckInScheduledEmail(props: CheckInScheduledEmailProps) {
  return (
    <CheckInEmailLayout content={contentOf(props)}>
      <CheckInEmailActionSection
        href={props.checkInsUrl}
        label={BUTTON_LABEL}
      />
    </CheckInEmailLayout>
  );
}

export function checkInScheduledText(
  props: CheckInScheduledEmailProps,
): string {
  return checkInEmailText(contentOf(props), {
    actionLines: [`${BUTTON_LABEL}: ${props.checkInsUrl}`],
  });
}

function contentOf(props: CheckInScheduledEmailProps): CheckInEmailContent {
  return {
    subject: SUBJECT,
    eyebrow: "Check-in — new request",
    heading: `A check-in with ${COACH_DISPLAY_NAME}.`,
    subhead: `${COACH_DISPLAY_NAME} picked a time. You can approve or decline it.`,
    details: [
      { label: "WHEN", value: props.when },
      ...(props.note ? [{ label: "NOTE", value: props.note }] : []),
    ],
    footerLine:
      "You received this email because your coach scheduled a check-in with you on the Evoa site.",
    currentYear: props.currentYear,
  };
}
