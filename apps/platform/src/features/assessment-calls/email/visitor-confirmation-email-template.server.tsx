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
  cardStyle,
  contactLineStyle,
  contactLinkStyle,
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
  letterParagraphStyle,
  letterSectionStyle,
  outerContainerStyle,
  reassuranceSectionStyle,
  reassuranceTextStyle,
  wordmarkSectionStyle,
  wordmarkStyle,
  wordmarkSubStyle,
} from "./assessment-call-email-styles.server";

export type VisitorConfirmationEmailViewModel = {
  contactEmail: string;
  content: {
    eyebrow: string;
    heading: string;
    letterParagraphs: readonly string[];
    previewText: string;
    reassurance: string;
    subhead: string;
  };
  currentYear: number;
  durationLabel: string;
  googleCalendarUrl: string;
  joinUrl: string;
  notes: string | null;
  scheduleLine: string;
  visitorEmail: string;
};

export function VisitorConfirmationEmailTemplate({
  contactEmail,
  content,
  currentYear,
  durationLabel,
  googleCalendarUrl,
  joinUrl,
  notes,
  scheduleLine,
  visitorEmail,
}: VisitorConfirmationEmailViewModel) {
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

            <EmailSection style={letterSectionStyle}>
              {content.letterParagraphs.map((paragraph) => (
                <EmailText key={paragraph} style={letterParagraphStyle}>
                  {paragraph}
                </EmailText>
              ))}
            </EmailSection>

            <EmailSection style={detailsOuterStyle}>
              <div style={detailsCardStyle}>
                <EmailText style={detailsEyebrowStyle}>WHEN</EmailText>
                <EmailText style={detailsValueStyle}>{scheduleLine}</EmailText>

                <EmailText style={detailsEyebrowStyle}>HOW LONG</EmailText>
                <EmailText style={detailsValueStyle}>{durationLabel}</EmailText>

                <EmailText style={detailsEyebrowStyle}>WHERE</EmailText>
                <EmailText style={detailsValueStyle}>
                  A video call — the link is right below.
                </EmailText>

                {notes ? (
                  <>
                    <EmailText style={detailsEyebrowStyle}>
                      WHAT YOU SHARED
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
              <EmailText style={contactLineStyle}>
                This confirmation went to {visitorEmail}. You can also write to{" "}
                <EmailLink
                  href={`mailto:${contactEmail}`}
                  style={contactLinkStyle}
                >
                  {contactEmail}
                </EmailLink>
                .
              </EmailText>
            </EmailSection>
          </EmailContainer>

          <EmailSection style={footerSectionStyle}>
            <EmailText style={footerLineStyle}>
              You received this email because you booked a free assessment call
              with Eli.
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
