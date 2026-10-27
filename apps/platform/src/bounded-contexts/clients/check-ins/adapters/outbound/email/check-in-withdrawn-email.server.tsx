import {
  CheckInEmailClosingLine,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";

export type CheckInWithdrawnEmailProps = {
  clientName: string;
  when: string;
  currentYear: number;
};

const CLOSING_LINE = "That hour is free again.";

export function checkInWithdrawnSubject({
  clientName,
}: Pick<CheckInWithdrawnEmailProps, "clientName">): string {
  return `${clientName} withdrew the check-in request`;
}

export function CheckInWithdrawnEmail(props: CheckInWithdrawnEmailProps) {
  return (
    <CheckInEmailLayout content={contentOf(props)}>
      <CheckInEmailClosingLine>{CLOSING_LINE}</CheckInEmailClosingLine>
    </CheckInEmailLayout>
  );
}

export function checkInWithdrawnText(
  props: CheckInWithdrawnEmailProps,
): string {
  return checkInEmailText(contentOf(props), {
    actionLines: [],
    closingLine: CLOSING_LINE,
  });
}

function contentOf(props: CheckInWithdrawnEmailProps): CheckInEmailContent {
  return {
    subject: checkInWithdrawnSubject(props),
    eyebrow: "Check-in — withdrawn",
    heading: "A request was withdrawn.",
    subhead: `${props.clientName} withdrew the check-in request.`,
    details: [{ label: "WHEN", value: props.when }],
    footerLine:
      "You received this email because a client withdrew a check-in request on the Evoa site.",
    currentYear: props.currentYear,
  };
}
