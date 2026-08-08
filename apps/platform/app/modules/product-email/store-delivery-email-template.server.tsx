import type { CSSProperties } from "react";

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
} from "./email-primitives.server";

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
            <EmailText style={wordmarkSubStyle}>
              Coaching for women
            </EmailText>
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
              <EmailLink
                href={options.downloadUrl}
                style={downloadButtonStyle}
              >
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
              You received this email because you requested free resources
              from the Evoa Fitness store.
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

const BRAND = {
  body: "#4A4A4A",
  cardBorder: "#EFE6E2",
  faint: "#A6A6A6",
  ink: "#121212",
  inkSoft: "#3A3A3A",
  muted: "#7A7A7A",
  page: "#F4EFEC",
  pink: "#C81D6B",
  pinkBorder: "#F4D8E4",
  pinkSoft: "#FFF5F8",
  white: "#FFFFFF",
} as const;
const FONT_SERIF =
  '"Playfair Display", Georgia, "Times New Roman", Times, serif';
const FONT_SANS =
  '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
const bodyStyle: CSSProperties = {
  WebkitFontSmoothing: "antialiased",
  backgroundColor: BRAND.page,
  fontFamily: FONT_SANS,
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
  color: BRAND.ink,
  fontFamily: FONT_SERIF,
  fontSize: "22px",
  fontWeight: 500,
  letterSpacing: "0.32em",
  lineHeight: 1.1,
  margin: 0,
};
const wordmarkSubStyle: CSSProperties = {
  color: BRAND.muted,
  fontFamily: FONT_SANS,
  fontSize: "11px",
  letterSpacing: "0.22em",
  lineHeight: 1.4,
  margin: "6px 0 0",
  textTransform: "uppercase",
};
const cardStyle: CSSProperties = {
  backgroundColor: BRAND.white,
  border: `1px solid ${BRAND.cardBorder}`,
  borderRadius: "20px",
  margin: "0 auto",
  maxWidth: "568px",
  overflow: "hidden",
  width: "100%",
};
const heroSectionStyle: CSSProperties = {
  backgroundColor: BRAND.ink,
  padding: "48px 36px 44px",
  textAlign: "center",
};
const heroEyebrowStyle: CSSProperties = {
  color: BRAND.pink,
  fontFamily: FONT_SANS,
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.22em",
  lineHeight: 1.4,
  margin: 0,
};
const heroHeadingStyle: CSSProperties = {
  color: BRAND.white,
  fontFamily: FONT_SERIF,
  fontSize: "40px",
  fontWeight: 500,
  letterSpacing: "-0.01em",
  lineHeight: 1.05,
  margin: "14px 0 0",
};
const heroAccentRuleStyle: CSSProperties = {
  backgroundColor: BRAND.pink,
  borderRadius: "2px",
  height: "2px",
  margin: "20px auto 18px",
  width: "40px",
};
const heroSubheadStyle: CSSProperties = {
  color: "#D9D9D9",
  fontFamily: FONT_SANS,
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
  color: BRAND.body,
  fontFamily: FONT_SANS,
  fontSize: "16px",
  fontWeight: 400,
  lineHeight: 1.65,
  margin: "0 0 18px",
};
const signoffStyle: CSSProperties = {
  color: BRAND.ink,
  fontFamily: FONT_SERIF,
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
  backgroundColor: BRAND.pink,
  borderRadius: "999px",
  color: BRAND.white,
  display: "inline-block",
  fontFamily: FONT_SANS,
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
  backgroundColor: BRAND.pinkSoft,
  border: `1px solid ${BRAND.pinkBorder}`,
  borderRadius: "16px",
  padding: "28px 28px 12px",
};
const resourcesEyebrowStyle: CSSProperties = {
  color: BRAND.pink,
  fontFamily: FONT_SANS,
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
  color: BRAND.pink,
  fontFamily: FONT_SERIF,
  fontSize: "14px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  lineHeight: 1,
  margin: "0 0 4px",
};
const resourceTitleStyle: CSSProperties = {
  color: BRAND.inkSoft,
  fontFamily: FONT_SANS,
  fontSize: "15px",
  fontWeight: 500,
  lineHeight: 1.55,
  margin: 0,
};
const resourceTypeStyle: CSSProperties = {
  color: BRAND.muted,
  fontFamily: FONT_SANS,
  fontSize: "12px",
  fontWeight: 400,
  letterSpacing: "0.08em",
  lineHeight: 1.55,
  margin: "2px 0 0",
  textTransform: "uppercase",
};
const dividerStyle: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${BRAND.cardBorder}`,
  margin: "0 36px",
  width: "auto",
};
const reassuranceSectionStyle: CSSProperties = {
  padding: "28px 36px 36px",
  textAlign: "center",
};
const reassuranceTextStyle: CSSProperties = {
  color: BRAND.muted,
  fontFamily: FONT_SANS,
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1.55,
  margin: "0 0 12px",
};
const contactLineStyle: CSSProperties = {
  color: BRAND.muted,
  fontFamily: FONT_SANS,
  fontSize: "13px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: 0,
};
const contactLinkStyle: CSSProperties = {
  color: BRAND.pink,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};
const footerSectionStyle: CSSProperties = {
  padding: "28px 24px 0",
  textAlign: "center",
};
const footerLineStyle: CSSProperties = {
  color: BRAND.faint,
  fontFamily: FONT_SANS,
  fontSize: "12px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: "0 0 8px",
};
const footerLinkStyle: CSSProperties = {
  color: BRAND.muted,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};
const footerCreditStyle: CSSProperties = {
  color: BRAND.faint,
  fontFamily: FONT_SANS,
  fontSize: "11px",
  fontWeight: 400,
  letterSpacing: "0.08em",
  margin: "12px 0 0",
};
