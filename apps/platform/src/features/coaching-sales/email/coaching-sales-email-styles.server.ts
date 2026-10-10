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

export const signoffStyle: CSSProperties = {
  color: EMAIL_COLORS.ink,
  fontFamily: EMAIL_FONTS.serif,
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
  backgroundColor: EMAIL_COLORS.pinkSoft,
  border: `1px solid ${EMAIL_COLORS.pinkBorder}`,
  borderRadius: "16px",
  marginBottom: "12px",
  padding: "18px 20px",
};

export const bundleTitleStyle: CSSProperties = {
  color: EMAIL_COLORS.ink,
  fontFamily: EMAIL_FONTS.serif,
  fontSize: "18px",
  fontWeight: 500,
  lineHeight: 1.3,
  margin: 0,
};

export const bundlePriceStyle: CSSProperties = {
  color: EMAIL_COLORS.pink,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "15px",
  fontWeight: 600,
  lineHeight: 1.4,
  margin: "6px 0 0",
};

export const bundleTotalStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "13px",
  lineHeight: 1.4,
  margin: "2px 0 0",
};

export const buttonSectionStyle: CSSProperties = {
  padding: "16px 36px 8px",
  textAlign: "center",
};

export const acceptButtonSectionStyle: CSSProperties = {
  padding: "24px 36px 8px",
  textAlign: "center",
};

export const nextStepsOuterStyle: CSSProperties = {
  padding: "24px 24px 32px",
};

export const nextStepsCardStyle: CSSProperties = {
  backgroundColor: EMAIL_COLORS.pinkSoft,
  border: `1px solid ${EMAIL_COLORS.pinkBorder}`,
  borderRadius: "16px",
  padding: "28px 28px 12px",
};

export const nextStepsEyebrowStyle: CSSProperties = {
  color: EMAIL_COLORS.pink,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.22em",
  lineHeight: 1.4,
  margin: "0 0 18px",
};

export const nextStepRowStyle: CSSProperties = {
  marginBottom: "16px",
};

export const nextStepNumberStyle: CSSProperties = {
  color: EMAIL_COLORS.pink,
  fontFamily: EMAIL_FONTS.serif,
  fontSize: "14px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  lineHeight: 1,
  margin: "0 0 4px",
};

export const nextStepTextStyle: CSSProperties = {
  color: EMAIL_COLORS.inkSoft,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "15px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: 0,
};

export const noteSectionStyle: CSSProperties = {
  padding: "16px 36px 24px",
  textAlign: "center",
};

export const noteTextStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "13px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: 0,
};

export const noteLinkStyle: CSSProperties = {
  color: EMAIL_COLORS.pink,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

export const dividerStyle: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${EMAIL_COLORS.cardBorder}`,
  margin: "0 36px",
  width: "auto",
};

export const reassuranceSectionStyle: CSSProperties = {
  padding: "24px 36px 32px",
  textAlign: "center",
};

export const invitationReassuranceSectionStyle: CSSProperties = {
  padding: "28px 36px 36px",
  textAlign: "center",
};

export const reassuranceTextStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1.55,
  margin: "0 0 12px",
};

export const contactLineStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "13px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: 0,
};

export const contactLinkStyle: CSSProperties = {
  color: EMAIL_COLORS.pink,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

export const footerLinkStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

export const detailsSectionStyle: CSSProperties = { ...nextStepsOuterStyle };

export const detailsCardStyle: CSSProperties = { ...nextStepsCardStyle };

export const detailsLabelStyle: CSSProperties = { ...nextStepsEyebrowStyle };

export const detailsValueStyle: CSSProperties = { ...nextStepTextStyle };

export const closingNoteSectionStyle: CSSProperties = {
  ...invitationReassuranceSectionStyle,
};

export const closingNoteTextStyle: CSSProperties = { ...reassuranceTextStyle };
