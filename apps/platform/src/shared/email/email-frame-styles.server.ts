import type { CSSProperties } from "react";

import { EMAIL_COLORS, EMAIL_FONTS } from "./email-theme.server";

export const EMAIL_FRAME_STYLES = {
  body: {
    backgroundColor: EMAIL_COLORS.page,
    fontFamily: EMAIL_FONTS.sans,
    margin: 0,
    MozOsxFontSmoothing: "grayscale",
    padding: 0,
    WebkitFontSmoothing: "antialiased",
    width: "100%",
  },
  outerContainer: {
    margin: "0 auto",
    maxWidth: "600px",
    padding: "32px 16px 48px",
    width: "100%",
  },
  wordmarkSection: {
    padding: "4px 0 24px",
    textAlign: "center",
  },
  wordmark: {
    color: EMAIL_COLORS.ink,
    fontFamily: EMAIL_FONTS.serif,
    fontSize: "22px",
    fontWeight: 500,
    letterSpacing: "0.32em",
    lineHeight: 1.1,
    margin: 0,
  },
  wordmarkSub: {
    color: EMAIL_COLORS.muted,
    fontFamily: EMAIL_FONTS.sans,
    fontSize: "11px",
    letterSpacing: "0.22em",
    lineHeight: 1.4,
    margin: "6px 0 0",
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: EMAIL_COLORS.white,
    border: `1px solid ${EMAIL_COLORS.cardBorder}`,
    borderRadius: "20px",
    margin: "0 auto",
    maxWidth: "568px",
    overflow: "hidden",
    width: "100%",
  },
  footerSection: {
    padding: "28px 24px 0",
    textAlign: "center",
  },
  footerLine: {
    color: EMAIL_COLORS.faint,
    fontFamily: EMAIL_FONTS.sans,
    fontSize: "12px",
    fontWeight: 400,
    lineHeight: 1.55,
    margin: "0 0 8px",
  },
  footerCredit: {
    color: EMAIL_COLORS.faint,
    fontFamily: EMAIL_FONTS.sans,
    fontSize: "11px",
    fontWeight: 400,
    letterSpacing: "0.08em",
    margin: "12px 0 0",
  },
} as const satisfies Record<string, CSSProperties>;

export const EMAIL_PRIMARY_BUTTON_STYLE: CSSProperties = {
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
