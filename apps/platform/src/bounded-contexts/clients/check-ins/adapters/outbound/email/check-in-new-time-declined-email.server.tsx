import {
  CheckInEmailClosingLine,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";

export type CheckInNewTimeDeclinedEmailProps = {
  who: string;
  when: string;
  currentYear: number;
};

const CLOSING_LINE = "That hour is free again.";

export function checkInNewTimeDeclinedSubject({
  who,
}: Pick<CheckInNewTimeDeclinedEmailProps, "who">): string {
  return `${who} declined the new time`;
}

export function CheckInNewTimeDeclinedEmail(
  props: CheckInNewTimeDeclinedEmailProps,
) {
  return (
    <CheckInEmailLayout content={contentOf(props)}>
      <CheckInEmailClosingLine>{CLOSING_LINE}</CheckInEmailClosingLine>
    </CheckInEmailLayout>
  );
}

export function checkInNewTimeDeclinedText(
  props: CheckInNewTimeDeclinedEmailProps,
): string {
  return checkInEmailText(contentOf(props), {
    actionLines: [],
    closingLine: CLOSING_LINE,
  });
}

function contentOf(
  props: CheckInNewTimeDeclinedEmailProps,
): CheckInEmailContent {
  return {
    subject: checkInNewTimeDeclinedSubject(props),
    eyebrow: "Check-in — new time declined",
    heading: "The new time was declined.",
    subhead: "Here is who declined it. The check-in is cancelled.",
    details: [
      { label: "WHO", value: props.who },
      { label: "WHEN", value: props.when },
    ],
    footerLine:
      "You received this email because a new time you proposed for a check-in was declined on the Evoa site.",
    currentYear: props.currentYear,
  };
}
