import {
  EmailBody,
  EmailContainer,
  EmailDivider,
  EmailHead,
  EmailHeading,
  EmailHtml,
  EmailLink,
  EmailPreviewText,
  EmailSection,
  EmailText,
} from "@eli-coach-platform/infrastructure/email/server";

import { AssessmentCallEmailActions } from "./assessment-call-email-actions.server";
import {
  bodyStyle,
  calendarLinkStyle,
  cardStyle,
  detailsCardStyle,
  detailsEyebrowStyle,
  detailsOuterStyle,
  detailsValueStyle,
  dividerStyle,
  footerCreditStyle,
  footerLineStyle,
  footerSectionStyle,
  heroAccentRuleStyle,
  heroEyebrowStyle,
  heroHeadingStyle,
  heroSectionStyle,
  heroSubheadStyle,
  outerContainerStyle,
  reassuranceSectionStyle,
  reassuranceTextStyle,
  wordmarkSectionStyle,
  wordmarkStyle,
  wordmarkSubStyle,
} from "./assessment-call-email-styles.server";

export type CoachNotificationEmailViewModel = {
  content: {
    eyebrow: string;
    heading: string;
    previewText: string;
    reassurance: string;
    subhead: string;
  };
  currentYear: number;
  durationLabel: string;
  googleCalendarUrl: string;
  joinUrl: string;
  notes: string | null;
  profile: VisitorProfileViewModel;
  scheduleLine: string;
  visitorEmail: string;
  visitorName: string;
};

type VisitorProfileViewModel = {
  ageLine: string;
  country: string;
  gender: string;
  phone: string | null;
  primaryGoal: string;
};

export function CoachNotificationEmailTemplate({
  content,
  currentYear,
  durationLabel,
  googleCalendarUrl,
  joinUrl,
  notes,
  profile,
  scheduleLine,
  visitorEmail,
  visitorName,
}: CoachNotificationEmailViewModel) {
  return (
    <EmailHtml lang="en">
      <EmailHead>
        <title>{content.previewText}</title>
        <meta content="light only" name="color-scheme" />
        <meta content="light only" name="supported-color-schemes" />
      </EmailHead>
      <EmailBody style={bodyStyle}>
        <EmailPreviewText>{content.previewText}</EmailPreviewText>
        <EmailContainer maxWidth={600} style={outerContainerStyle}>
          <EmailSection style={wordmarkSectionStyle}>
            <EmailText style={wordmarkStyle}>EVOA</EmailText>
            <EmailText style={wordmarkSubStyle}>Coaching for women</EmailText>
          </EmailSection>

          <EmailContainer maxWidth={568} style={cardStyle}>
            <EmailSection style={heroSectionStyle}>
              <EmailText style={heroEyebrowStyle}>
                {content.eyebrow.toUpperCase()}
              </EmailText>
              <EmailHeading level="h1" style={heroHeadingStyle}>
                {content.heading}
              </EmailHeading>
              <div style={heroAccentRuleStyle} />
              <EmailText style={heroSubheadStyle}>{content.subhead}</EmailText>
            </EmailSection>

            <EmailSection style={detailsOuterStyle}>
              <div style={detailsCardStyle}>
                <EmailText style={detailsEyebrowStyle}>WHO</EmailText>
                <EmailText style={detailsValueStyle}>{visitorName}</EmailText>

                <EmailText style={detailsEyebrowStyle}>EMAIL</EmailText>
                <EmailText style={detailsValueStyle}>
                  <EmailLink
                    href={`mailto:${visitorEmail}`}
                    style={calendarLinkStyle}
                  >
                    {visitorEmail}
                  </EmailLink>
                </EmailText>

                {profile.phone ? (
                  <>
                    <EmailText style={detailsEyebrowStyle}>PHONE</EmailText>
                    <EmailText style={detailsValueStyle}>
                      <EmailLink
                        href={`tel:${profile.phone}`}
                        style={calendarLinkStyle}
                      >
                        {profile.phone}
                      </EmailLink>
                    </EmailText>
                  </>
                ) : null}

                <EmailText style={detailsEyebrowStyle}>AGE</EmailText>
                <EmailText style={detailsValueStyle}>
                  {profile.ageLine}
                </EmailText>

                <EmailText style={detailsEyebrowStyle}>GENDER</EmailText>
                <EmailText style={detailsValueStyle}>
                  {profile.gender}
                </EmailText>

                <EmailText style={detailsEyebrowStyle}>GOAL</EmailText>
                <EmailText style={detailsValueStyle}>
                  {profile.primaryGoal}
                </EmailText>

                <EmailText style={detailsEyebrowStyle}>COUNTRY</EmailText>
                <EmailText style={detailsValueStyle}>
                  {profile.country}
                </EmailText>

                <EmailText style={detailsEyebrowStyle}>WHEN</EmailText>
                <EmailText style={detailsValueStyle}>{scheduleLine}</EmailText>

                <EmailText style={detailsEyebrowStyle}>HOW LONG</EmailText>
                <EmailText style={detailsValueStyle}>{durationLabel}</EmailText>

                {notes ? (
                  <>
                    <EmailText style={detailsEyebrowStyle}>
                      WHAT SHE SHARED
                    </EmailText>
                    <EmailText style={detailsValueStyle}>{notes}</EmailText>
                  </>
                ) : null}
              </div>
            </EmailSection>

            <AssessmentCallEmailActions
              googleCalendarUrl={googleCalendarUrl}
              joinUrl={joinUrl}
            />

            <EmailDivider style={dividerStyle} />

            <EmailSection style={reassuranceSectionStyle}>
              <EmailText style={reassuranceTextStyle}>
                {content.reassurance}
              </EmailText>
            </EmailSection>
          </EmailContainer>

          <EmailSection style={footerSectionStyle}>
            <EmailText style={footerLineStyle}>
              You received this email because someone booked a free assessment
              call on the Evoa site.
            </EmailText>
            <EmailText style={footerCreditStyle}>
              © {currentYear} Evoa Fitness
            </EmailText>
          </EmailSection>
        </EmailContainer>
      </EmailBody>
    </EmailHtml>
  );
}
