import {
  EmailLink,
  EmailSection,
  EmailText,
} from "@eli-coach-platform/infrastructure/email/server";

import {
  attachmentLineStyle,
  buttonSectionStyle,
  calendarLineStyle,
  calendarLinkStyle,
  primaryButtonStyle,
} from "./assessment-call-email-styles.server";

export const ASSESSMENT_CALL_ACTION_COPY = {
  attachmentLine:
    "A calendar file is attached to this email, so you can add the call to any calendar you use.",
  calendarLabel: "Add to Google Calendar",
  joinLabel: "Join the call",
};

type AssessmentCallEmailActionsViewModel = {
  googleCalendarUrl: string;
  joinUrl: string;
};

export function AssessmentCallEmailActions({
  googleCalendarUrl,
  joinUrl,
}: AssessmentCallEmailActionsViewModel) {
  return (
    <EmailSection style={buttonSectionStyle}>
      <EmailLink href={joinUrl} style={primaryButtonStyle}>
        {ASSESSMENT_CALL_ACTION_COPY.joinLabel}
      </EmailLink>
      <EmailText style={calendarLineStyle}>
        <EmailLink href={googleCalendarUrl} style={calendarLinkStyle}>
          {ASSESSMENT_CALL_ACTION_COPY.calendarLabel}
        </EmailLink>
      </EmailText>
      <EmailText style={attachmentLineStyle}>
        {ASSESSMENT_CALL_ACTION_COPY.attachmentLine}
      </EmailText>
    </EmailSection>
  );
}
