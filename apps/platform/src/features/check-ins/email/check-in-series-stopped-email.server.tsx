import {
  CheckInEmailActionSection,
  CheckInEmailClosingLine,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";

export type CheckInSeriesStoppedEmailProps = {
  coachName: string;
  when: string;
  checkInsUrl: string;
  currentYear: number;
};

const BUTTON_LABEL = "See your check-ins";
const CLOSING_LINE = "Your coach will arrange any next check-in with you.";

export function checkInSeriesStoppedSubject({
  coachName,
}: Pick<CheckInSeriesStoppedEmailProps, "coachName">): string {
  return `${coachName} stopped your weekly check-in`;
}

export function CheckInSeriesStoppedEmail(
  props: CheckInSeriesStoppedEmailProps,
) {
  return (
    <CheckInEmailLayout content={contentOf(props)}>
      <CheckInEmailActionSection
        href={props.checkInsUrl}
        label={BUTTON_LABEL}
      />
      <CheckInEmailClosingLine>{CLOSING_LINE}</CheckInEmailClosingLine>
    </CheckInEmailLayout>
  );
}

export function checkInSeriesStoppedText(
  props: CheckInSeriesStoppedEmailProps,
): string {
  return checkInEmailText(contentOf(props), {
    actionLines: [`${BUTTON_LABEL}: ${props.checkInsUrl}`],
    closingLine: CLOSING_LINE,
  });
}

function contentOf(props: CheckInSeriesStoppedEmailProps): CheckInEmailContent {
  return {
    subject: checkInSeriesStoppedSubject(props),
    eyebrow: "Check-in — weekly",
    heading: "Your weekly check-in has stopped.",
    subhead: `${props.coachName} cancelled every week still to come.`,
    details: [{ label: "WHEN", value: props.when }],
    footerLine:
      "You received this email because your coach stopped your weekly check-in on the Evoa site.",
    currentYear: props.currentYear,
  };
}
