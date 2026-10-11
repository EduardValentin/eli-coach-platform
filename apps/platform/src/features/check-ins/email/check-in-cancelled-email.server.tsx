import {
  CheckInEmailClosingLine,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";

export type CheckInCancelledEmailProps = {
  who: string;
  when: string;
  currentYear: number;
};

const CLOSING_LINE = "That hour is free again.";

export function checkInCancelledSubject({
  who,
}: Pick<CheckInCancelledEmailProps, "who">): string {
  return `${who} cancelled the check-in`;
}

export function CheckInCancelledEmail(props: CheckInCancelledEmailProps) {
  return (
    <CheckInEmailLayout content={contentOf(props)}>
      <CheckInEmailClosingLine>{CLOSING_LINE}</CheckInEmailClosingLine>
    </CheckInEmailLayout>
  );
}

export function checkInCancelledText(
  props: CheckInCancelledEmailProps,
): string {
  return checkInEmailText(contentOf(props), {
    actionLines: [],
    closingLine: CLOSING_LINE,
  });
}

function contentOf(props: CheckInCancelledEmailProps): CheckInEmailContent {
  return {
    subject: checkInCancelledSubject(props),
    eyebrow: "Check-in — cancelled",
    heading: "A check-in was cancelled.",
    subhead: "Here is who cancelled it and when.",
    details: [
      { label: "WHO", value: props.who },
      { label: "WHEN", value: props.when },
    ],
    footerLine:
      "You received this email because a check-in you had planned was cancelled on the Evoa site.",
    currentYear: props.currentYear,
  };
}
