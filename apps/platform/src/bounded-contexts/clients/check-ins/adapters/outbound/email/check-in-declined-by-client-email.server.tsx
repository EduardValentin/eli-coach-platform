import {
  CheckInEmailClosingLine,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";

export type CheckInDeclinedByClientEmailProps = {
  clientName: string;
  when: string;
  currentYear: number;
};

const CLOSING_LINE = "That hour is free again.";

export function checkInDeclinedByClientSubject({
  clientName,
}: Pick<CheckInDeclinedByClientEmailProps, "clientName">): string {
  return `${clientName} declined the check-in`;
}

export function CheckInDeclinedByClientEmail(
  props: CheckInDeclinedByClientEmailProps,
) {
  return (
    <CheckInEmailLayout content={contentOf(props)}>
      <CheckInEmailClosingLine>{CLOSING_LINE}</CheckInEmailClosingLine>
    </CheckInEmailLayout>
  );
}

export function checkInDeclinedByClientText(
  props: CheckInDeclinedByClientEmailProps,
): string {
  return checkInEmailText(contentOf(props), {
    actionLines: [],
    closingLine: CLOSING_LINE,
  });
}

function contentOf(
  props: CheckInDeclinedByClientEmailProps,
): CheckInEmailContent {
  return {
    subject: checkInDeclinedByClientSubject(props),
    eyebrow: "Check-in — declined",
    heading: "Your check-in was declined.",
    subhead: "Here is who declined and when.",
    details: [
      { label: "WHO", value: props.clientName },
      { label: "WHEN", value: props.when },
    ],
    footerLine:
      "You received this email because a client answered a check-in you scheduled on the Evoa site.",
    currentYear: props.currentYear,
  };
}
