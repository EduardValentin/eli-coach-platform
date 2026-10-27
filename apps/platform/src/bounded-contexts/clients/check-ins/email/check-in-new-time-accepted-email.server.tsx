import {
  CheckInEmailActionSection,
  CheckInEmailCalendarOffer,
  checkInEmailCalendarOfferLines,
  CheckInEmailClosingLine,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";

export type CheckInNewTimeAcceptedEmailProps = {
  who: string;
  when: string;
  joinUrl: string;
  googleCalendarUrl: string;
  currentYear: number;
};

const BUTTON_LABEL = "Join the check-in";
const CLOSING_LINE = "Use the button to join when it is time.";

export function checkInNewTimeAcceptedSubject({
  who,
}: Pick<CheckInNewTimeAcceptedEmailProps, "who">): string {
  return `${who} accepted the new time`;
}

export function CheckInNewTimeAcceptedEmail(
  props: CheckInNewTimeAcceptedEmailProps,
) {
  return (
    <CheckInEmailLayout content={contentOf(props)}>
      <CheckInEmailActionSection href={props.joinUrl} label={BUTTON_LABEL}>
        <CheckInEmailCalendarOffer
          googleCalendarUrl={props.googleCalendarUrl}
        />
      </CheckInEmailActionSection>
      <CheckInEmailClosingLine>{CLOSING_LINE}</CheckInEmailClosingLine>
    </CheckInEmailLayout>
  );
}

export function checkInNewTimeAcceptedText(
  props: CheckInNewTimeAcceptedEmailProps,
): string {
  return checkInEmailText(contentOf(props), {
    actionLines: [
      `${BUTTON_LABEL}: ${props.joinUrl}`,
      ...checkInEmailCalendarOfferLines(props.googleCalendarUrl),
    ],
    closingLine: CLOSING_LINE,
  });
}

function contentOf(
  props: CheckInNewTimeAcceptedEmailProps,
): CheckInEmailContent {
  return {
    subject: checkInNewTimeAcceptedSubject(props),
    eyebrow: "Check-in — new time accepted",
    heading: "The new time is set.",
    subhead: "Here is who accepted it and when.",
    details: [
      { label: "WHO", value: props.who },
      { label: "WHEN", value: props.when },
    ],
    footerLine:
      "You received this email because a new time you proposed for a check-in was accepted on the Evoa site.",
    currentYear: props.currentYear,
  };
}
