import {
  CheckInEmailActionSection,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";

export type CheckInSeriesChangedEmailProps = {
  coachName: string;
  when: string;
  firstWeek: string;
  checkInsUrl: string;
  currentYear: number;
};

const BUTTON_LABEL = "See your check-ins";

export function checkInSeriesChangedSubject({
  coachName,
}: Pick<CheckInSeriesChangedEmailProps, "coachName">): string {
  return `${coachName} changed your weekly check-in`;
}

export function CheckInSeriesChangedEmail(
  props: CheckInSeriesChangedEmailProps,
) {
  return (
    <CheckInEmailLayout content={contentOf(props)}>
      <CheckInEmailActionSection
        href={props.checkInsUrl}
        label={BUTTON_LABEL}
      />
    </CheckInEmailLayout>
  );
}

export function checkInSeriesChangedText(
  props: CheckInSeriesChangedEmailProps,
): string {
  return checkInEmailText(contentOf(props), {
    actionLines: [`${BUTTON_LABEL}: ${props.checkInsUrl}`],
  });
}

function contentOf(props: CheckInSeriesChangedEmailProps): CheckInEmailContent {
  return {
    subject: checkInSeriesChangedSubject(props),
    eyebrow: "Check-in — weekly",
    heading: "Your weekly check-in moved.",
    subhead: `${props.coachName} moved every week still to come.`,
    details: [
      { label: "WHEN", value: props.when },
      { label: "FIRST WEEK", value: props.firstWeek },
    ],
    footerLine:
      "You received this email because your coach changed your weekly check-in on the Evoa site.",
    currentYear: props.currentYear,
  };
}
