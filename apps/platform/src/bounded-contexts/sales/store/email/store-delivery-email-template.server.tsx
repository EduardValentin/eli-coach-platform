import {
  EMAIL_COLORS,
  EMAIL_FONTS,
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
import type { CSSProperties } from "react";

type StoreDeliveryEmailResourceViewModel = {
  title: string;
  typeLabel: string;
};

export type StoreDeliveryEmailViewModel = {
  contactEmail: string;
  copy: {
    bodyParagraphs: readonly string[];
    buttonLabel: string;
    heading: string;
    previewText: string;
    subject: string;
    subhead: string;
  };
  currentYear: number;
  downloadUrl: string;
  resources: readonly StoreDeliveryEmailResourceViewModel[];
};

export function StoreDeliveryEmailTemplate(
  options: StoreDeliveryEmailViewModel,
) {
  return (
    <EmailHtml lang="en">
      <EmailHead>
        <title>{options.copy.previewText}</title>
        <meta content="light only" name="color-scheme" />
        <meta content="light only" name="supported-color-schemes" />
      </EmailHead>
      <EmailBody style={bodyStyle}>
        <EmailPreviewText>{options.copy.previewText}</EmailPreviewText>
        <EmailContainer maxWidth={600} style={outerContainerStyle}>
          <EmailSection style={wordmarkSectionStyle}>
            <EmailText style={wordmarkStyle}>EVOA</EmailText>
            <EmailText style={wordmarkSubStyle}>Coaching for women</EmailText>
          </EmailSection>
          <EmailContainer maxWidth={568} style={cardStyle}>
            <EmailSection style={heroSectionStyle}>
              <EmailText style={heroEyebrowStyle}>
                STORE — YOUR RESOURCES
              </EmailText>
              <EmailHeading level="h1" style={heroHeadingStyle}>
                {options.copy.heading}
              </EmailHeading>
              <div style={heroAccentRuleStyle} />
              <EmailText style={heroSubheadStyle}>
                {options.copy.subhead}
              </EmailText>
            </EmailSection>
            <EmailSection style={letterSectionStyle}>
              {options.copy.bodyParagraphs.map((paragraph) => (
                <EmailText
                  key={paragraph}
                  style={
                    paragraph.startsWith("—")
                      ? signoffStyle
                      : letterParagraphStyle
                  }
                >
                  {paragraph}
                </EmailText>
              ))}
            </EmailSection>
            <EmailSection style={buttonSectionStyle}>
              <EmailLink href={options.downloadUrl} style={downloadButtonStyle}>
                {options.copy.buttonLabel}
              </EmailLink>
            </EmailSection>
            <EmailSection style={resourcesOuterStyle}>
              <div style={resourcesCardStyle}>
                <EmailText style={resourcesEyebrowStyle}>
                  WHAT&apos;S INSIDE
                </EmailText>
                {options.resources.map((resource, index) => (
                  <div
                    key={`${resource.title}-${index}`}
                    style={resourceRowStyle}
                  >
                    <EmailText style={resourceBulletStyle}>
                      {String(index + 1).padStart(2, "0")}
                    </EmailText>
                    <EmailText style={resourceTitleStyle}>
                      {resource.title}
                    </EmailText>
                    <EmailText style={resourceTypeStyle}>
                      {resource.typeLabel}
                    </EmailText>
                  </div>
                ))}
              </div>
            </EmailSection>
            <EmailDivider style={dividerStyle} />
            <EmailSection style={reassuranceSectionStyle}>
              <EmailText style={reassuranceTextStyle}>
                This is a delivery email for the resources you requested — no
                marketing, just your download.
              </EmailText>
              <EmailText style={contactLineStyle}>
                Questions? Reply to this email or write to{" "}
                <EmailLink
                  href={`mailto:${options.contactEmail}`}
                  style={contactLinkStyle}
                >
                  {options.contactEmail}
                </EmailLink>
                .
              </EmailText>
            </EmailSection>
          </EmailContainer>
          <EmailSection style={footerSectionStyle}>
            <EmailText style={footerLineStyle}>
              You received this email because you requested free resources from
              the Evoa Fitness store.
            </EmailText>
            <EmailText style={footerLineStyle}>
              <EmailLink
                href={`mailto:${options.contactEmail}`}
                style={footerLinkStyle}
              >
                Contact
              </EmailLink>
            </EmailText>
            <EmailText style={footerCreditStyle}>
              © {options.currentYear} Evoa Fitness
            </EmailText>
          </EmailSection>
        </EmailContainer>
      </EmailBody>
    </EmailHtml>
  );
}

const bodyStyle: CSSProperties = {
  WebkitFontSmoothing: "antialiased",
  backgroundColor: EMAIL_COLORS.page,
  fontFamily: EMAIL_FONTS.sans,
  margin: 0,
  padding: 0,
  width: "100%",
};
const outerContainerStyle: CSSProperties = {
  margin: "0 auto",
  maxWidth: "600px",
  padding: "32px 16px 48px",
  width: "100%",
};
const wordmarkSectionStyle: CSSProperties = {
  padding: "4px 0 24px",
  textAlign: "center",
};
const wordmarkStyle: CSSProperties = {
  color: EMAIL_COLORS.ink,
  fontFamily: EMAIL_FONTS.serif,
  fontSize: "22px",
  fontWeight: 500,
  letterSpacing: "0.32em",
  lineHeight: 1.1,
  margin: 0,
};
const wordmarkSubStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "11px",
  letterSpacing: "0.22em",
  lineHeight: 1.4,
  margin: "6px 0 0",
  textTransform: "uppercase",
};
const cardStyle: CSSProperties = {
  backgroundColor: EMAIL_COLORS.white,
  border: `1px solid ${EMAIL_COLORS.cardBorder}`,
  borderRadius: "20px",
  margin: "0 auto",
  maxWidth: "568px",
  overflow: "hidden",
  width: "100%",
};
const heroSectionStyle: CSSProperties = {
  backgroundColor: EMAIL_COLORS.ink,
  padding: "48px 36px 44px",
  textAlign: "center",
};
const heroEyebrowStyle: CSSProperties = {
  color: EMAIL_COLORS.pinkOnDark,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.22em",
  lineHeight: 1.4,
  margin: 0,
};
const heroHeadingStyle: CSSProperties = {
  color: EMAIL_COLORS.white,
  fontFamily: EMAIL_FONTS.serif,
  fontSize: "40px",
  fontWeight: 500,
  letterSpacing: "-0.01em",
  lineHeight: 1.05,
  margin: "14px 0 0",
};
const heroAccentRuleStyle: CSSProperties = {
  backgroundColor: EMAIL_COLORS.pinkOnDark,
  borderRadius: "2px",
  height: "2px",
  margin: "20px auto 18px",
  width: "40px",
};
const heroSubheadStyle: CSSProperties = {
  color: EMAIL_COLORS.mutedOnDark,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "15px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: "0 auto",
  maxWidth: "420px",
};
const letterSectionStyle: CSSProperties = {
  padding: "40px 36px 4px",
};
const letterParagraphStyle: CSSProperties = {
  color: EMAIL_COLORS.body,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "16px",
  fontWeight: 400,
  lineHeight: 1.65,
  margin: "0 0 18px",
};
const signoffStyle: CSSProperties = {
  color: EMAIL_COLORS.ink,
  fontFamily: EMAIL_FONTS.serif,
  fontSize: "20px",
  fontStyle: "italic",
  fontWeight: 500,
  lineHeight: 1.4,
  margin: "8px 0 0",
};
const buttonSectionStyle: CSSProperties = {
  padding: "24px 36px 8px",
  textAlign: "center",
};
const downloadButtonStyle: CSSProperties = {
  backgroundColor: EMAIL_COLORS.pink,
  borderRadius: "14px",
  color: EMAIL_COLORS.white,
  display: "inline-block",
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "16px",
  fontWeight: 600,
  lineHeight: 1,
  padding: "18px 40px",
  textDecoration: "none",
};
const resourcesOuterStyle: CSSProperties = {
  padding: "24px 24px 32px",
};
const resourcesCardStyle: CSSProperties = {
  backgroundColor: EMAIL_COLORS.pinkSoft,
  border: `1px solid ${EMAIL_COLORS.pinkBorder}`,
  borderRadius: "16px",
  padding: "28px 28px 12px",
};
const resourcesEyebrowStyle: CSSProperties = {
  color: EMAIL_COLORS.pink,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.22em",
  lineHeight: 1.4,
  margin: "0 0 18px",
};
const resourceRowStyle: CSSProperties = {
  marginBottom: "16px",
};
const resourceBulletStyle: CSSProperties = {
  color: EMAIL_COLORS.pink,
  fontFamily: EMAIL_FONTS.serif,
  fontSize: "14px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  lineHeight: 1,
  margin: "0 0 4px",
};
const resourceTitleStyle: CSSProperties = {
  color: EMAIL_COLORS.inkSoft,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "15px",
  fontWeight: 500,
  lineHeight: 1.55,
  margin: 0,
};
const resourceTypeStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "12px",
  fontWeight: 400,
  letterSpacing: "0.08em",
  lineHeight: 1.55,
  margin: "2px 0 0",
  textTransform: "uppercase",
};
const dividerStyle: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${EMAIL_COLORS.cardBorder}`,
  margin: "0 36px",
  width: "auto",
};
const reassuranceSectionStyle: CSSProperties = {
  padding: "28px 36px 36px",
  textAlign: "center",
};
const reassuranceTextStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1.55,
  margin: "0 0 12px",
};
const contactLineStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "13px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: 0,
};
const contactLinkStyle: CSSProperties = {
  color: EMAIL_COLORS.pink,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};
const footerSectionStyle: CSSProperties = {
  padding: "28px 24px 0",
  textAlign: "center",
};
const footerLineStyle: CSSProperties = {
  color: EMAIL_COLORS.faint,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "12px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: "0 0 8px",
};
const footerLinkStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};
const footerCreditStyle: CSSProperties = {
  color: EMAIL_COLORS.faint,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "11px",
  fontWeight: 400,
  letterSpacing: "0.08em",
  margin: "12px 0 0",
};
