import {
  CheckInEmailActionSection,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";

export type CheckInRequestedEmailProps = {
  clientName: string;
  note: string | null;
  when: string;
  reviewUrl: string;
  currentYear: number;
};

const BUTTON_LABEL = "Review the request";

export function checkInRequestedSubject({
  clientName,
}: Pick<CheckInRequestedEmailProps, "clientName">): string {
  return `${clientName} asked for a check-in`;
}

export function CheckInRequestedEmail(props: CheckInRequestedEmailProps) {
  return (
    <CheckInEmailLayout content={contentOf(props)}>
      <CheckInEmailActionSection href={props.reviewUrl} label={BUTTON_LABEL} />
    </CheckInEmailLayout>
  );
}

export function checkInRequestedText(
  props: CheckInRequestedEmailProps,
): string {
  return checkInEmailText(contentOf(props), {
    actionLines: [`${BUTTON_LABEL}: ${props.reviewUrl}`],
  });
}

function contentOf(props: CheckInRequestedEmailProps): CheckInEmailContent {
  return {
    subject: checkInRequestedSubject(props),
    eyebrow: "Check-in — new request",
    heading: "A new check-in request.",
    subhead: "Here is who asked and when.",
    details: [
      { label: "WHO", value: props.clientName },
      { label: "WHEN", value: props.when },
      ...(props.note ? [{ label: "NOTE", value: props.note }] : []),
    ],
    footerLine:
      "You received this email because a client asked for a check-in on the Evoa site.",
    currentYear: props.currentYear,
  };
}
