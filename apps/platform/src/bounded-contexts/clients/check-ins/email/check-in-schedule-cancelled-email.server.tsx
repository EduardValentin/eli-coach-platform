import { COACH_DISPLAY_NAME } from "@eli-coach-platform/content";

import {
  CheckInEmailClosingLine,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";

export type CheckInScheduleCancelledEmailProps = {
  when: string;
  currentYear: number;
};

const SUBJECT = `${COACH_DISPLAY_NAME} cancelled the check-in request`;
const CLOSING_LINE = "No check-in is planned for that hour.";

export function checkInScheduleCancelledSubject(): string {
  return SUBJECT;
}

export function CheckInScheduleCancelledEmail(
  props: CheckInScheduleCancelledEmailProps,
) {
  return (
    <CheckInEmailLayout content={contentOf(props)}>
      <CheckInEmailClosingLine>{CLOSING_LINE}</CheckInEmailClosingLine>
    </CheckInEmailLayout>
  );
}

export function checkInScheduleCancelledText(
  props: CheckInScheduleCancelledEmailProps,
): string {
  return checkInEmailText(contentOf(props), {
    actionLines: [],
    closingLine: CLOSING_LINE,
  });
}

function contentOf(
  props: CheckInScheduleCancelledEmailProps,
): CheckInEmailContent {
  return {
    subject: SUBJECT,
    eyebrow: "Check-in — cancelled",
    heading: "A request was cancelled.",
    subhead: `${COACH_DISPLAY_NAME} cancelled the check-in request.`,
    details: [{ label: "WHEN", value: props.when }],
    footerLine:
      "You received this email because your coach cancelled a check-in request on the Evoa site.",
    currentYear: props.currentYear,
  };
}
