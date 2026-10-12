import {
  EMAIL_COLORS,
  EMAIL_FONTS,
  EMAIL_FRAME_STYLES,
  EMAIL_PRIMARY_BUTTON_STYLE,
  contactLineStyle,
  contactLinkStyle,
  dividerStyle,
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
  heroAccentRuleStyle,
  heroEyebrowStyle,
  heroHeadingStyle,
  heroSectionStyle,
  heroSubheadStyle,
  closingReassuranceSectionStyle,
  letterParagraphStyle,
  letterSectionStyle,
  nextStepsCardStyle,
  nextStepsEyebrowStyle,
  nextStepsOuterStyle,
  nextStepTextStyle,
  reassuranceTextStyle,
  signoffStyle,
} from "@eli-coach-platform/infrastructure/email/server";
import type { CSSProperties } from "react";

const acceptButtonSectionStyle: CSSProperties = {
  padding: "24px 36px 8px",
  textAlign: "center",
};

const nextStepRowStyle: CSSProperties = {
  marginBottom: "16px",
};

const nextStepNumberStyle: CSSProperties = {
  color: EMAIL_COLORS.pink,
  fontFamily: EMAIL_FONTS.serif,
  fontSize: "14px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  lineHeight: 1,
  margin: "0 0 4px",
};

const footerLinkStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

export type ClientInvitationEmailCopy = {
  buttonLabel: string;
  eyebrow: string;
  footer: string;
  greeting: string;
  heading: string;
  letter: readonly string[];
  nextSteps: readonly string[];
  nextStepsTitle: string;
  previewText: string;
  reassurance: string;
  signoff: string;
  subhead: string;
};

export type ClientInvitationEmailViewModel = {
  acceptUrl: string;
  contactEmail: string;
  copy: ClientInvitationEmailCopy;
  currentYear: number;
};

export function ClientInvitationEmailTemplate({
  acceptUrl,
  contactEmail,
  copy,
  currentYear,
}: ClientInvitationEmailViewModel) {
  return (
    <EmailHtml lang="en">
      <EmailHead>
        <title>{copy.previewText}</title>
        <meta content="light only" name="color-scheme" />
        <meta content="light only" name="supported-color-schemes" />
      </EmailHead>
      <EmailBody style={EMAIL_FRAME_STYLES.body}>
        <EmailPreviewText>{copy.previewText}</EmailPreviewText>
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
              <EmailText style={heroEyebrowStyle}>
                {copy.eyebrow.toUpperCase()}
              </EmailText>
              <EmailHeading level="h1" style={heroHeadingStyle}>
                {copy.heading}
              </EmailHeading>
              <div style={heroAccentRuleStyle} />
              <EmailText style={heroSubheadStyle}>{copy.subhead}</EmailText>
            </EmailSection>

            <EmailSection style={letterSectionStyle}>
              <EmailText style={letterParagraphStyle}>
                {copy.greeting}
              </EmailText>
              {copy.letter.map((paragraph) => (
                <EmailText key={paragraph} style={letterParagraphStyle}>
                  {paragraph}
                </EmailText>
              ))}
              <EmailText style={signoffStyle}>{copy.signoff}</EmailText>
            </EmailSection>

            <EmailSection style={acceptButtonSectionStyle}>
              <EmailLink href={acceptUrl} style={EMAIL_PRIMARY_BUTTON_STYLE}>
                {copy.buttonLabel}
              </EmailLink>
            </EmailSection>

            <EmailSection style={nextStepsOuterStyle}>
              <div style={nextStepsCardStyle}>
                <EmailText style={nextStepsEyebrowStyle}>
                  {copy.nextStepsTitle.toUpperCase()}
                </EmailText>
                {copy.nextSteps.map((step, index) => (
                  <div key={step} style={nextStepRowStyle}>
                    <EmailText style={nextStepNumberStyle}>
                      {stepNumber(index)}
                    </EmailText>
                    <EmailText style={nextStepTextStyle}>{step}</EmailText>
                  </div>
                ))}
              </div>
            </EmailSection>

            <EmailDivider style={dividerStyle} />

            <EmailSection style={closingReassuranceSectionStyle}>
              <EmailText style={reassuranceTextStyle}>
                {copy.reassurance}
              </EmailText>
              <EmailText style={contactLineStyle}>
                Questions? Reply to this email or write to{" "}
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

          <EmailSection style={EMAIL_FRAME_STYLES.footerSection}>
            <EmailText style={EMAIL_FRAME_STYLES.footerLine}>
              {copy.footer}
            </EmailText>
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

export function stepNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}
