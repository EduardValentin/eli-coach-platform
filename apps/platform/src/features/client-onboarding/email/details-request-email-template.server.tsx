import {
  EmailBody,
  EmailContainer,
  EmailHead,
  EmailHeading,
  EmailHtml,
  EmailLink,
  EmailPreviewText,
  EmailSection,
  EmailText,
} from "@eli-coach-platform/infrastructure/email/server";

import {
  answerButtonStyle,
  bodyStyle,
  buttonSectionStyle,
  cardStyle,
  footerCreditStyle,
  footerLineStyle,
  footerLinkStyle,
  footerSectionStyle,
  heroAccentRuleStyle,
  heroHeadingStyle,
  heroSectionStyle,
  letterParagraphStyle,
  letterSectionStyle,
  outerContainerStyle,
  signoffSectionStyle,
  signoffStyle,
  wordmarkSectionStyle,
  wordmarkStyle,
  wordmarkSubStyle,
} from "./details-request-email-styles.server";

export type DetailsRequestEmailCopy = {
  body: string;
  buttonLabel: string;
  greeting: string;
  heading: string;
  signoff: string;
  subject: string;
};

export type DetailsRequestEmailViewModel = {
  contactEmail: string;
  copy: DetailsRequestEmailCopy;
  currentYear: number;
  portalUrl: string;
};

export function DetailsRequestEmailTemplate({
  contactEmail,
  copy,
  currentYear,
  portalUrl,
}: DetailsRequestEmailViewModel) {
  return (
    <EmailHtml lang="en">
      <EmailHead>
        <title>{copy.subject}</title>
        <meta content="light only" name="color-scheme" />
        <meta content="light only" name="supported-color-schemes" />
      </EmailHead>
      <EmailBody style={bodyStyle}>
        <EmailPreviewText>{copy.subject}</EmailPreviewText>
        <EmailContainer maxWidth={600} style={outerContainerStyle}>
          <EmailSection style={wordmarkSectionStyle}>
            <EmailText style={wordmarkStyle}>EVOA</EmailText>
            <EmailText style={wordmarkSubStyle}>Coaching for women</EmailText>
          </EmailSection>

          <EmailContainer maxWidth={568} style={cardStyle}>
            <EmailSection style={heroSectionStyle}>
              <EmailHeading level="h1" style={heroHeadingStyle}>
                {copy.heading}
              </EmailHeading>
              <div style={heroAccentRuleStyle} />
            </EmailSection>

            <EmailSection style={letterSectionStyle}>
              <EmailText style={letterParagraphStyle}>
                {copy.greeting}
              </EmailText>
              <EmailText style={letterParagraphStyle}>{copy.body}</EmailText>
            </EmailSection>

            <EmailSection style={buttonSectionStyle}>
              <EmailLink href={portalUrl} style={answerButtonStyle}>
                {copy.buttonLabel}
              </EmailLink>
            </EmailSection>

            <EmailSection style={signoffSectionStyle}>
              <EmailText style={signoffStyle}>{copy.signoff}</EmailText>
            </EmailSection>
          </EmailContainer>

          <EmailSection style={footerSectionStyle}>
            <EmailText style={footerLineStyle}>
              <EmailLink
                href={`mailto:${contactEmail}`}
                style={footerLinkStyle}
              >
                Contact
              </EmailLink>
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
