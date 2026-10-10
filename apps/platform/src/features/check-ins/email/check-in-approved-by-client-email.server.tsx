import {
  CheckInEmailActionSection,
  CheckInEmailCalendarOffer,
  checkInEmailCalendarOfferLines,
  CheckInEmailClosingLine,
  CheckInEmailLayout,
  checkInEmailText,
  type CheckInEmailContent,
} from "./check-in-email-layout.server";

export type CheckInApprovedByClientEmailProps = {
  clientName: string;
  when: string;
  joinUrl: string;
  googleCalendarUrl: string;
  currentYear: number;
};

const BUTTON_LABEL = "Join Meet";
const CLOSING_LINE = "Use the button to join when it is time.";

export function checkInApprovedByClientSubject({
  clientName,
}: Pick<CheckInApprovedByClientEmailProps, "clientName">): string {
  return `${clientName} approved the check-in`;
}

export function CheckInApprovedByClientEmail(
  props: CheckInApprovedByClientEmailProps,
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

export function checkInApprovedByClientText(
  props: CheckInApprovedByClientEmailProps,
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
  props: CheckInApprovedByClientEmailProps,
): CheckInEmailContent {
  return {
    subject: checkInApprovedByClientSubject(props),
    eyebrow: "Check-in — approved",
    heading: "Your check-in is approved.",
    subhead: "Here is who approved it and when.",
    details: [
      { label: "WHO", value: props.clientName },
      { label: "WHEN", value: props.when },
    ],
    footerLine:
      "You received this email because a client answered a check-in you scheduled on the Evoa site.",
    currentYear: props.currentYear,
  };
}
