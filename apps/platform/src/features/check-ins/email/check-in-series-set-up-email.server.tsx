import {
  CheckInEmailActionSection,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";

export type CheckInSeriesSetUpEmailProps = {
  coachName: string;
  when: string;
  firstWeek: string;
  checkInsUrl: string;
  currentYear: number;
};

const BUTTON_LABEL = "See your check-ins";

export function checkInSeriesSetUpSubject({
  coachName,
}: Pick<CheckInSeriesSetUpEmailProps, "coachName">): string {
  return `${coachName} set up a weekly check-in with you`;
}

export function CheckInSeriesSetUpEmail(props: CheckInSeriesSetUpEmailProps) {
  return (
    <CheckInEmailLayout content={contentOf(props)}>
      <CheckInEmailActionSection
        href={props.checkInsUrl}
        label={BUTTON_LABEL}
      />
    </CheckInEmailLayout>
  );
}

export function checkInSeriesSetUpText(
  props: CheckInSeriesSetUpEmailProps,
): string {
  return checkInEmailText(contentOf(props), {
    actionLines: [`${BUTTON_LABEL}: ${props.checkInsUrl}`],
  });
}

function contentOf(props: CheckInSeriesSetUpEmailProps): CheckInEmailContent {
  return {
    subject: checkInSeriesSetUpSubject(props),
    eyebrow: "Check-in — weekly",
    heading: `A weekly check-in with ${props.coachName}.`,
    subhead: `${props.coachName} booked a check-in every week until your paid period ends.`,
    details: [
      { label: "WHEN", value: props.when },
      { label: "FIRST WEEK", value: props.firstWeek },
    ],
    footerLine:
      "You received this email because your coach set up a weekly check-in with you on the Evoa site.",
    currentYear: props.currentYear,
  };
}
