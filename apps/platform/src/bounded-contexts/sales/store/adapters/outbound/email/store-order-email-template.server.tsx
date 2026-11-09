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
} from "~/shared/email/index.server";
import type { CSSProperties } from "react";

export const STORE_ORDER_EMAIL_COPY = {
  subject: "Your order is confirmed",
  previewText: "Your order is confirmed — your download is inside.",
  eyebrow: "Store — your order",
  heading: "Thank you for your order.",
  subhead: "Everything you ordered, in one download.",
  buttonLabel: "Download your order",
  bodyParagraphs: [
    "Hi there,",
    "Thank you for your order. Tap the button below and your download starts right away — everything you ordered arrives together.",
    "The link works for the next seven days.",
    "— Eli",
  ],
  orderEyebrow: "YOUR ORDER",
  freeLabel: "FREE",
  consentEyebrow: "YOUR REQUEST FOR IMMEDIATE DELIVERY",
  receiptNote: "Stripe sends your payment receipt in a separate email.",
  footer:
    "You received this email because you placed an order in the Evoa Fitness store.",
} as const;

type StoreOrderEmailLine = {
  title: string;
  amount: string | null;
};

export type StoreOrderEmailViewModel = {
  contactEmail: string;
  currentYear: number;
  currency: string;
  deliveryConfirmationNotice: string;
  deliveryConsentStatement: string;
  downloadUrl: string;
  lines: readonly StoreOrderEmailLine[];
  termsLinkLabel: string;
  termsUrl: string;
  total: string;
};

const COPY = STORE_ORDER_EMAIL_COPY;

export function StoreOrderEmailTemplate(options: StoreOrderEmailViewModel) {
  return (
    <EmailHtml lang="en">
      <EmailHead>
        <title>{COPY.previewText}</title>
        <meta content="light only" name="color-scheme" />
        <meta content="light only" name="supported-color-schemes" />
      </EmailHead>
      <EmailBody style={bodyStyle}>
        <EmailPreviewText>{COPY.previewText}</EmailPreviewText>
        <EmailContainer maxWidth={600} style={outerContainerStyle}>
          <EmailSection style={wordmarkSectionStyle}>
            <EmailText style={wordmarkStyle}>EVOA</EmailText>
            <EmailText style={wordmarkSubStyle}>Coaching for women</EmailText>
          </EmailSection>
          <EmailContainer maxWidth={568} style={cardStyle}>
            <EmailSection style={heroSectionStyle}>
              <EmailText style={heroEyebrowStyle}>
                {COPY.eyebrow.toUpperCase()}
              </EmailText>
              <EmailHeading level="h1" style={heroHeadingStyle}>
                {COPY.heading}
              </EmailHeading>
              <div style={heroAccentRuleStyle} />
              <EmailText style={heroSubheadStyle}>{COPY.subhead}</EmailText>
            </EmailSection>
            <EmailSection style={letterSectionStyle}>
              {COPY.bodyParagraphs.map((paragraph) => (
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
                {COPY.buttonLabel}
              </EmailLink>
            </EmailSection>
            <EmailSection style={orderOuterStyle}>
              <div style={orderCardStyle}>
                <EmailText style={orderEyebrowStyle}>
                  {COPY.orderEyebrow}
                </EmailText>
                <table
                  border={0}
                  cellPadding={0}
                  cellSpacing={0}
                  role="presentation"
                  style={orderTableStyle}
                >
                  <tbody>
                    {options.lines.map((line, index) => (
                      <tr key={`${line.title}-${index}`}>
                        <td style={lineTitleCellStyle}>{line.title}</td>
                        <td style={lineAmountCellStyle}>
                          {line.amount === null ? (
                            <span style={freeLabelStyle}>{COPY.freeLabel}</span>
                          ) : (
                            line.amount
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td style={totalLabelCellStyle}>
                        {`TOTAL (${options.currency})`}
                      </td>
                      <td style={totalAmountCellStyle}>{options.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </EmailSection>
            <EmailSection style={consentSectionStyle}>
              <EmailText style={consentEyebrowStyle}>
                {COPY.consentEyebrow}
              </EmailText>
              <EmailText style={consentStatementStyle}>
                {`“${options.deliveryConsentStatement}”`}
              </EmailText>
              <EmailText style={consentNoteStyle}>
                {options.deliveryConfirmationNotice}
              </EmailText>
              <EmailText style={consentNoteStyle}>
                Your order is governed by{" "}
                <EmailLink href={options.termsUrl} style={inlineLinkStyle}>
                  {options.termsLinkLabel}
                </EmailLink>
                , which you accepted when you ordered.
              </EmailText>
            </EmailSection>
            <EmailDivider style={dividerStyle} />
            <EmailSection style={reassuranceSectionStyle}>
              <EmailText style={reassuranceTextStyle}>
                {COPY.receiptNote}
              </EmailText>
              <EmailText style={contactLineStyle}>
                Questions? Reply to this email or write to{" "}
                <EmailLink
                  href={`mailto:${options.contactEmail}`}
                  style={inlineLinkStyle}
                >
                  {options.contactEmail}
                </EmailLink>
                .
              </EmailText>
            </EmailSection>
          </EmailContainer>
          <EmailSection style={footerSectionStyle}>
            <EmailText style={footerLineStyle}>{COPY.footer}</EmailText>
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
  margin: 0,
  padding: 0,
  width: "100%",
  backgroundColor: EMAIL_COLORS.page,
  fontFamily: EMAIL_FONTS.sans,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
};
const outerContainerStyle: CSSProperties = {
  width: "100%",
  maxWidth: "600px",
  margin: "0 auto",
  padding: "32px 16px 48px",
};
const wordmarkSectionStyle: CSSProperties = {
  textAlign: "center",
  padding: "4px 0 24px",
};
const wordmarkStyle: CSSProperties = {
  margin: 0,
  fontFamily: EMAIL_FONTS.serif,
  fontSize: "22px",
  fontWeight: 500,
  letterSpacing: "0.32em",
  color: EMAIL_COLORS.ink,
  lineHeight: 1.1,
};
const wordmarkSubStyle: CSSProperties = {
  margin: "6px 0 0",
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "11px",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: EMAIL_COLORS.muted,
  lineHeight: 1.4,
};
const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: "568px",
  margin: "0 auto",
  backgroundColor: EMAIL_COLORS.white,
  borderRadius: "20px",
  border: `1px solid ${EMAIL_COLORS.cardBorder}`,
  overflow: "hidden",
};
const heroSectionStyle: CSSProperties = {
  backgroundColor: EMAIL_COLORS.ink,
  padding: "48px 36px 44px",
  textAlign: "center",
};
const heroEyebrowStyle: CSSProperties = {
  margin: 0,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "11px",
  letterSpacing: "0.22em",
  color: EMAIL_COLORS.pinkOnDark,
  fontWeight: 600,
  lineHeight: 1.4,
};
const heroHeadingStyle: CSSProperties = {
  margin: "14px 0 0",
  fontFamily: EMAIL_FONTS.serif,
  fontSize: "40px",
  lineHeight: 1.05,
  fontWeight: 500,
  color: EMAIL_COLORS.white,
  letterSpacing: "-0.01em",
};
const heroAccentRuleStyle: CSSProperties = {
  width: "40px",
  height: "2px",
  backgroundColor: EMAIL_COLORS.pinkOnDark,
  margin: "20px auto 18px",
  borderRadius: "2px",
};
const heroSubheadStyle: CSSProperties = {
  margin: 0,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "15px",
  lineHeight: 1.55,
  color: EMAIL_COLORS.mutedOnDark,
  fontWeight: 400,
  maxWidth: "420px",
  marginLeft: "auto",
  marginRight: "auto",
};
const letterSectionStyle: CSSProperties = {
  padding: "40px 36px 4px",
};
const letterParagraphStyle: CSSProperties = {
  margin: "0 0 18px",
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "16px",
  lineHeight: 1.65,
  color: EMAIL_COLORS.body,
  fontWeight: 400,
};
const signoffStyle: CSSProperties = {
  margin: "8px 0 0",
  fontFamily: EMAIL_FONTS.serif,
  fontSize: "20px",
  lineHeight: 1.4,
  color: EMAIL_COLORS.ink,
  fontWeight: 500,
  fontStyle: "italic",
};
const buttonSectionStyle: CSSProperties = {
  padding: "24px 36px 8px",
  textAlign: "center",
};
const downloadButtonStyle: CSSProperties = {
  display: "inline-block",
  backgroundColor: EMAIL_COLORS.pink,
  color: EMAIL_COLORS.white,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "16px",
  fontWeight: 600,
  lineHeight: 1,
  padding: "18px 40px",
  borderRadius: "14px",
  textDecoration: "none",
};
const orderOuterStyle: CSSProperties = {
  padding: "24px 24px 8px",
};
const orderCardStyle: CSSProperties = {
  padding: "24px 24px 20px",
  backgroundColor: EMAIL_COLORS.pinkSoft,
  border: `1px solid ${EMAIL_COLORS.pinkBorder}`,
  borderRadius: "16px",
};
const orderEyebrowStyle: CSSProperties = {
  margin: "0 0 12px",
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "11px",
  letterSpacing: "0.22em",
  color: EMAIL_COLORS.pink,
  fontWeight: 600,
  lineHeight: 1.4,
};
const orderTableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};
const lineCellStyle: CSSProperties = {
  padding: "10px 0",
  borderBottom: `1px solid ${EMAIL_COLORS.pinkBorder}`,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "15px",
  lineHeight: 1.5,
  verticalAlign: "top",
};
const lineTitleCellStyle: CSSProperties = {
  ...lineCellStyle,
  paddingRight: "16px",
  color: EMAIL_COLORS.inkSoft,
  fontWeight: 500,
};
const lineAmountCellStyle: CSSProperties = {
  ...lineCellStyle,
  textAlign: "right",
  whiteSpace: "nowrap",
  color: EMAIL_COLORS.muted,
  fontWeight: 600,
};
const freeLabelStyle: CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.12em",
  color: EMAIL_COLORS.teal,
  fontWeight: 600,
};
const totalLabelCellStyle: CSSProperties = {
  padding: "14px 0 0",
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "11px",
  letterSpacing: "0.16em",
  color: EMAIL_COLORS.muted,
  fontWeight: 600,
  lineHeight: 1.5,
};
const totalAmountCellStyle: CSSProperties = {
  padding: "14px 0 0",
  textAlign: "right",
  whiteSpace: "nowrap",
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "18px",
  color: EMAIL_COLORS.ink,
  fontWeight: 600,
  lineHeight: 1.3,
};
const consentSectionStyle: CSSProperties = {
  padding: "24px 36px 28px",
};
const consentEyebrowStyle: CSSProperties = {
  margin: "0 0 10px",
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "11px",
  letterSpacing: "0.18em",
  color: EMAIL_COLORS.teal,
  fontWeight: 600,
  lineHeight: 1.4,
};
const consentStatementStyle: CSSProperties = {
  margin: "0 0 12px",
  padding: "0 0 0 14px",
  borderLeft: `2px solid ${EMAIL_COLORS.cardBorder}`,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "13px",
  lineHeight: 1.6,
  color: EMAIL_COLORS.body,
  fontWeight: 400,
};
const consentNoteStyle: CSSProperties = {
  margin: "0 0 10px",
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "13px",
  lineHeight: 1.6,
  color: EMAIL_COLORS.muted,
  fontWeight: 400,
};
const inlineLinkStyle: CSSProperties = {
  color: EMAIL_COLORS.pink,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
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
  margin: "0 0 12px",
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "14px",
  lineHeight: 1.55,
  color: EMAIL_COLORS.muted,
  fontWeight: 500,
};
const contactLineStyle: CSSProperties = {
  margin: 0,
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "13px",
  lineHeight: 1.55,
  color: EMAIL_COLORS.muted,
  fontWeight: 400,
};
const footerSectionStyle: CSSProperties = {
  padding: "28px 24px 0",
  textAlign: "center",
};
const footerLineStyle: CSSProperties = {
  margin: "0 0 8px",
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "12px",
  lineHeight: 1.55,
  color: EMAIL_COLORS.faint,
  fontWeight: 400,
};
const footerLinkStyle: CSSProperties = {
  color: EMAIL_COLORS.muted,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};
const footerCreditStyle: CSSProperties = {
  margin: "12px 0 0",
  fontFamily: EMAIL_FONTS.sans,
  fontSize: "11px",
  letterSpacing: "0.08em",
  color: EMAIL_COLORS.faint,
  fontWeight: 400,
};
