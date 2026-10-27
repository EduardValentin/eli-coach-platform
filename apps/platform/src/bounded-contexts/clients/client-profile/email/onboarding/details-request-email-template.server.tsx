import {
  EMAIL_FRAME_STYLES,
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
  buttonSectionStyle,
  footerLinkStyle,
  heroAccentRuleStyle,
  heroHeadingStyle,
  heroSectionStyle,
  letterParagraphStyle,
  letterSectionStyle,
  signoffSectionStyle,
  signoffStyle,
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
      <EmailBody style={EMAIL_FRAME_STYLES.body}>
        <EmailPreviewText>{copy.subject}</EmailPreviewText>
        <EmailContainer
          maxWidth={600}
          style={EMAIL_FRAME_STYLES.outerContainer}
        >
          <EmailSection style={EMAIL_FRAME_STYLES.wordmarkSection}>
            <EmailText style={EMAIL_FRAME_STYLES.wordmark}>EVOA</EmailText>
            <EmailText style={EMAIL_FRAME_STYLES.wordmarkSub}>
              Coaching for women
            </EmailText>
          </EmailSection>

          <EmailContainer maxWidth={568} style={EMAIL_FRAME_STYLES.card}>
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

          <EmailSection style={EMAIL_FRAME_STYLES.footerSection}>
            <EmailText style={EMAIL_FRAME_STYLES.footerLine}>
              <EmailLink
                href={`mailto:${contactEmail}`}
                style={footerLinkStyle}
              >
                Contact
              </EmailLink>
            </EmailText>
            <EmailText style={EMAIL_FRAME_STYLES.footerCredit}>
              © {currentYear} Evoa Fitness
            </EmailText>
          </EmailSection>
        </EmailContainer>
      </EmailBody>
    </EmailHtml>
  );
}
