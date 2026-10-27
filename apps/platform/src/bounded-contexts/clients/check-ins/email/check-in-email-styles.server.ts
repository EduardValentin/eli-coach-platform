import {
  EMAIL_COLORS,
  EMAIL_FONTS,
} from "@eli-coach-platform/infrastructure/email/server";
import type { CSSProperties } from "react";

export const heroSectionStyle: CSSProperties = {
  backgroundColor: EMAIL_COLORS.ink,
  padding: "48px 36px 44px",
  textAlign: "center",
};

export const heroEyebrowStyle: CSSProperties = {
  color: EMAIL_COLORS.pinkOnDark,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.22em",
  lineHeight: 1.4,
  margin: 0,
};

export const heroHeadingStyle: CSSProperties = {
  color: EMAIL_COLORS.white,
  fontFamily: EMAIL_FONTS.serif,
  fontSize: "40px",
  fontWeight: 500,
  letterSpacing: "-0.01em",
  lineHeight: 1.05,
  margin: "14px 0 0",
};

export const heroAccentRuleStyle: CSSProperties = {
  backgroundColor: EMAIL_COLORS.pinkOnDark,
  borderRadius: "2px",
  height: "2px",
  margin: "20px auto 18px",
  width: "40px",
};

export const heroSubheadStyle: CSSProperties = {
  color: EMAIL_COLORS.mutedOnDark,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "15px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: 0,
  marginLeft: "auto",
  marginRight: "auto",
  maxWidth: "420px",
};

export const detailsOuterStyle: CSSProperties = {
  padding: "32px 24px 8px",
};

export const detailsCardStyle: CSSProperties = {
  backgroundColor: EMAIL_COLORS.pinkSoft,
  border: `1px solid ${EMAIL_COLORS.pinkBorder}`,
  borderRadius: "16px",
  padding: "28px 28px 16px",
};

export const detailsEyebrowStyle: CSSProperties = {
  color: EMAIL_COLORS.pink,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.22em",
  lineHeight: 1.4,
  margin: "0 0 4px",
};

export const detailsValueStyle: CSSProperties = {
  color: EMAIL_COLORS.inkSoft,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "15px",
  fontWeight: 500,
  lineHeight: 1.55,
  margin: "0 0 18px",
};

export const buttonSectionStyle: CSSProperties = {
  padding: "20px 36px 8px",
  textAlign: "center",
};

export const calendarLineStyle: CSSProperties = {
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1.55,
  margin: "18px 0 0",
};

export const calendarLinkStyle: CSSProperties = {
  color: EMAIL_COLORS.pink,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

export const attachmentLineStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "13px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: "12px 0 0",
};

export const dividerStyle: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${EMAIL_COLORS.cardBorder}`,
  margin: "28px 36px 0",
  width: "auto",
};

export const closingSectionStyle: CSSProperties = {
  padding: "28px 36px 0",
  textAlign: "center",
};

export const closingTextStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1.55,
  margin: 0,
};

export const cardEndStyle: CSSProperties = {
  height: "36px",
};
