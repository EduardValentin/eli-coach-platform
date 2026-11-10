import {
  EMAIL_COLORS,
  EMAIL_FONTS,
  closingReassuranceSectionStyle,
  nextStepsCardStyle,
  nextStepsEyebrowStyle,
  nextStepsOuterStyle,
  nextStepTextStyle,
  reassuranceTextStyle,
} from "~/shared/email/index.server";
import type { CSSProperties } from "react";

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

export const reassuranceSectionStyle: CSSProperties = {
  padding: "24px 36px 32px",
  textAlign: "center",
};

export const detailsSectionStyle: CSSProperties = { ...nextStepsOuterStyle };

export const detailsCardStyle: CSSProperties = { ...nextStepsCardStyle };

export const detailsLabelStyle: CSSProperties = { ...nextStepsEyebrowStyle };

export const detailsValueStyle: CSSProperties = { ...nextStepTextStyle };

export const closingNoteSectionStyle: CSSProperties = {
  ...closingReassuranceSectionStyle,
};

export const closingNoteTextStyle: CSSProperties = { ...reassuranceTextStyle };
