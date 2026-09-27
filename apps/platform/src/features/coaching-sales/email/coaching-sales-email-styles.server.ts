import type { CSSProperties } from "react";

const BRAND = {
  body: "#4A4A4A",
  cardBorder: "#EFE6E2",
  faint: "#6E6D6D",
  ink: "#121212",
  muted: "#616161",
  page: "#F4EFEC",
  pink: "#C81D6B",
  pinkBorder: "#F4D8E4",
  pinkOnDark: "#E03A7E",
  pinkSoft: "#FFF5F8",
  white: "#FFFFFF",
};

const FONT_SERIF =
  '"Playfair Display", Georgia, "Times New Roman", Times, serif';
const FONT_SANS =
  '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

export const bodyStyle: CSSProperties = {
  backgroundColor: BRAND.page,
  fontFamily: FONT_SANS,
  margin: 0,
  MozOsxFontSmoothing: "grayscale",
  padding: 0,
  WebkitFontSmoothing: "antialiased",
  width: "100%",
};

export const outerContainerStyle: CSSProperties = {
  margin: "0 auto",
  maxWidth: "600px",
  padding: "32px 16px 48px",
  width: "100%",
};

export const wordmarkSectionStyle: CSSProperties = {
  padding: "4px 0 24px",
  textAlign: "center",
};

export const wordmarkStyle: CSSProperties = {
  color: BRAND.ink,
  fontFamily: FONT_SERIF,
  fontSize: "22px",
  fontWeight: 500,
  letterSpacing: "0.32em",
  lineHeight: 1.1,
  margin: 0,
};

export const wordmarkSubStyle: CSSProperties = {
  color: BRAND.muted,
  fontFamily: FONT_SANS,
  fontSize: "11px",
  letterSpacing: "0.22em",
  lineHeight: 1.4,
  margin: "6px 0 0",
  textTransform: "uppercase",
};

export const cardStyle: CSSProperties = {
  backgroundColor: BRAND.white,
  border: `1px solid ${BRAND.cardBorder}`,
  borderRadius: "20px",
  margin: "0 auto",
  maxWidth: "568px",
  overflow: "hidden",
  width: "100%",
};

export const heroSectionStyle: CSSProperties = {
  backgroundColor: BRAND.ink,
  padding: "48px 36px 44px",
  textAlign: "center",
};

export const heroEyebrowStyle: CSSProperties = {
  color: BRAND.pinkOnDark,
  fontFamily: FONT_SANS,
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.22em",
  lineHeight: 1.4,
  margin: 0,
};

export const heroHeadingStyle: CSSProperties = {
  color: BRAND.white,
  fontFamily: FONT_SERIF,
  fontSize: "40px",
  fontWeight: 500,
  letterSpacing: "-0.01em",
  lineHeight: 1.05,
  margin: "14px 0 0",
};

export const heroAccentRuleStyle: CSSProperties = {
  backgroundColor: BRAND.pinkOnDark,
  borderRadius: "2px",
  height: "2px",
  margin: "20px auto 18px",
  width: "40px",
};

export const heroSubheadStyle: CSSProperties = {
  color: "#D9D9D9",
  fontFamily: FONT_SANS,
  fontSize: "15px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: 0,
  marginLeft: "auto",
  marginRight: "auto",
  maxWidth: "420px",
};

export const letterSectionStyle: CSSProperties = {
  padding: "40px 36px 4px",
};

export const letterParagraphStyle: CSSProperties = {
  color: BRAND.body,
  fontFamily: FONT_SANS,
  fontSize: "16px",
  fontWeight: 400,
  lineHeight: 1.65,
  margin: "0 0 18px",
};

export const signoffStyle: CSSProperties = {
  color: BRAND.ink,
  fontFamily: FONT_SERIF,
  fontSize: "20px",
  fontStyle: "italic",
  fontWeight: 500,
  lineHeight: 1.4,
  margin: "8px 0 0",
};

export const bundlesOuterStyle: CSSProperties = {
  padding: "24px 24px 8px",
};

export const bundleCardStyle: CSSProperties = {
  backgroundColor: BRAND.pinkSoft,
  border: `1px solid ${BRAND.pinkBorder}`,
  borderRadius: "16px",
  marginBottom: "12px",
  padding: "18px 20px",
};

export const bundleTitleStyle: CSSProperties = {
  color: BRAND.ink,
  fontFamily: FONT_SERIF,
  fontSize: "18px",
  fontWeight: 500,
  lineHeight: 1.3,
  margin: 0,
};

export const bundlePriceStyle: CSSProperties = {
  color: BRAND.pink,
  fontFamily: FONT_SANS,
  fontSize: "15px",
  fontWeight: 600,
  lineHeight: 1.4,
  margin: "6px 0 0",
};

export const bundleTotalStyle: CSSProperties = {
  color: BRAND.muted,
  fontFamily: FONT_SANS,
  fontSize: "13px",
  lineHeight: 1.4,
  margin: "2px 0 0",
};

export const buttonSectionStyle: CSSProperties = {
  padding: "16px 36px 8px",
  textAlign: "center",
};

export const chooseButtonStyle: CSSProperties = {
  backgroundColor: BRAND.pink,
  borderRadius: "14px",
  color: BRAND.white,
  display: "inline-block",
  fontFamily: FONT_SANS,
  fontSize: "16px",
  fontWeight: 600,
  lineHeight: 1,
  padding: "18px 40px",
  textDecoration: "none",
};

export const noteSectionStyle: CSSProperties = {
  padding: "16px 36px 24px",
  textAlign: "center",
};

export const noteTextStyle: CSSProperties = {
  color: BRAND.muted,
  fontFamily: FONT_SANS,
  fontSize: "13px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: 0,
};

export const noteLinkStyle: CSSProperties = {
  color: BRAND.pink,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

export const dividerStyle: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${BRAND.cardBorder}`,
  margin: "0 36px",
  width: "auto",
};

export const reassuranceSectionStyle: CSSProperties = {
  padding: "24px 36px 32px",
  textAlign: "center",
};

export const contactLineStyle: CSSProperties = {
  color: BRAND.muted,
  fontFamily: FONT_SANS,
  fontSize: "13px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: 0,
};

export const contactLinkStyle: CSSProperties = {
  color: BRAND.pink,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

export const footerSectionStyle: CSSProperties = {
  padding: "28px 24px 0",
  textAlign: "center",
};

export const footerLineStyle: CSSProperties = {
  color: BRAND.faint,
  fontFamily: FONT_SANS,
  fontSize: "12px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: "0 0 8px",
};

export const footerCreditStyle: CSSProperties = {
  color: BRAND.faint,
  fontFamily: FONT_SANS,
  fontSize: "11px",
  fontWeight: 400,
  letterSpacing: "0.08em",
  margin: "12px 0 0",
};
