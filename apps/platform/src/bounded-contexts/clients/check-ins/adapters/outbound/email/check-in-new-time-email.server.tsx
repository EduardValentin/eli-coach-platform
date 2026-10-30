import {
  CheckInEmailActionSection,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";

export type CheckInNewTimeEmailProps = {
  who: string;
  earlier: string;
  when: string;
  note: string | null;
  checkInsUrl: string;
  currentYear: number;
};

const BUTTON_LABEL = "Answer the proposal";

export function checkInNewTimeSubject({
  who,
}: Pick<CheckInNewTimeEmailProps, "who">): string {
  return `${who} proposed a new time for your check-in`;
}

export function CheckInNewTimeEmail(props: CheckInNewTimeEmailProps) {
  return (
    <CheckInEmailLayout content={contentOf(props)}>
      <CheckInEmailActionSection
        href={props.checkInsUrl}
        label={BUTTON_LABEL}
      />
    </CheckInEmailLayout>
  );
}

export function checkInNewTimeText(props: CheckInNewTimeEmailProps): string {
  return checkInEmailText(contentOf(props), {
    actionLines: [`${BUTTON_LABEL}: ${props.checkInsUrl}`],
  });
}

function contentOf(props: CheckInNewTimeEmailProps): CheckInEmailContent {
  const note = props.note?.trim() ? props.note : null;

  return {
    subject: checkInNewTimeSubject(props),
    eyebrow: "Check-in — new time",
    heading: "A new time for your check-in.",
    subhead: "Here is who proposed it and when.",
    details: [
      { label: "WHO", value: props.who },
      { label: "EARLIER", value: props.earlier },
      { label: "NEW TIME", value: props.when },
      ...(note ? [{ label: "NOTE", value: note }] : []),
    ],
    footerLine:
      "You received this email because a new time was proposed for one of your check-ins on the Evoa site.",
    currentYear: props.currentYear,
  };
}
