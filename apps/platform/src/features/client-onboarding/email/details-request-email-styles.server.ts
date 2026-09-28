import {
  EMAIL_COLORS,
  EMAIL_FONTS,
} from "@eli-coach-platform/infrastructure/email/server";
import type { CSSProperties } from "react";

export const bodyStyle: CSSProperties = {
  backgroundColor: EMAIL_COLORS.page,
  fontFamily: EMAIL_FONTS.sans,
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
  color: EMAIL_COLORS.ink,
  fontFamily: EMAIL_FONTS.serif,
  fontSize: "22px",
  fontWeight: 500,
  letterSpacing: "0.32em",
  lineHeight: 1.1,
  margin: 0,
};

export const wordmarkSubStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "11px",
  letterSpacing: "0.22em",
  lineHeight: 1.4,
  margin: "6px 0 0",
  textTransform: "uppercase",
};

export const cardStyle: CSSProperties = {
  backgroundColor: EMAIL_COLORS.white,
  border: `1px solid ${EMAIL_COLORS.cardBorder}`,
  borderRadius: "20px",
  margin: "0 auto",
  maxWidth: "568px",
  overflow: "hidden",
  width: "100%",
};

export const heroSectionStyle: CSSProperties = {
  backgroundColor: EMAIL_COLORS.ink,
  padding: "48px 36px 28px",
  textAlign: "center",
};

export const heroHeadingStyle: CSSProperties = {
  color: EMAIL_COLORS.white,
  fontFamily: EMAIL_FONTS.serif,
  fontSize: "40px",
  fontWeight: 500,
  letterSpacing: "-0.01em",
  lineHeight: 1.05,
  margin: 0,
};

export const heroAccentRuleStyle: CSSProperties = {
  backgroundColor: EMAIL_COLORS.pinkOnDark,
  borderRadius: "2px",
  height: "2px",
  margin: "20px auto 0",
  width: "40px",
};

export const letterSectionStyle: CSSProperties = {
  padding: "40px 36px 4px",
};

export const letterParagraphStyle: CSSProperties = {
  color: EMAIL_COLORS.body,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "16px",
  fontWeight: 400,
  lineHeight: 1.65,
  margin: "0 0 18px",
};

export const buttonSectionStyle: CSSProperties = {
  padding: "16px 36px 8px",
  textAlign: "center",
};

export const answerButtonStyle: CSSProperties = {
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

export const signoffSectionStyle: CSSProperties = {
  padding: "24px 36px 40px",
};

export const signoffStyle: CSSProperties = {
  color: EMAIL_COLORS.ink,
  fontFamily: EMAIL_FONTS.serif,
  fontSize: "20px",
  fontStyle: "italic",
  fontWeight: 500,
  lineHeight: 1.4,
  margin: 0,
};

export const footerSectionStyle: CSSProperties = {
  padding: "28px 24px 0",
  textAlign: "center",
};

export const footerLineStyle: CSSProperties = {
  color: EMAIL_COLORS.faint,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "12px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: "0 0 8px",
};

export const footerLinkStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

export const footerCreditStyle: CSSProperties = {
  color: EMAIL_COLORS.faint,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "11px",
  fontWeight: 400,
  letterSpacing: "0.08em",
  margin: "12px 0 0",
};
