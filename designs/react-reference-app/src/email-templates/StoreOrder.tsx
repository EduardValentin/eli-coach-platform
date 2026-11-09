import { PAID_DIGITAL_DELIVERY_CONSENT } from '~/bounded-contexts/legal/public';
import {
  EMAIL_BRAND,
  EMAIL_FONT_SANS,
  EMAIL_FONT_SERIF,
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
} from './_primitives';
import { formatStorePrice, type Currency } from '../app/context/StoreContext';
import { storeOrderTotal, type StoreOrderLine } from '../app/domain/storeOrder';

export type StoreOrderVariant = 'paid-and-free' | 'paid-only';

export type StoreOrderProps = {
  variant?: StoreOrderVariant;
  contactEmail?: string;
  downloadUrl?: string;
  termsUrl?: string;
};

const BRAND = EMAIL_BRAND;
const FONT_SERIF = EMAIL_FONT_SERIF;
const FONT_SANS = EMAIL_FONT_SANS;

const DEFAULT_CONTACT_EMAIL = 'contact@evoa.fit';

const PREVIEW_TEXT = 'Your order is confirmed — your download is inside.';
const EYEBROW = 'Store — your order';
const HEADING = 'Thank you for your order.';
const SUBHEAD = 'Everything you ordered, in one download.';
const BUTTON_LABEL = 'Download your order';

const BODY_PARAGRAPHS = [
  'Hi there,',
  'Thank you for your order. Tap the button below and your download starts right away — everything you ordered arrives together.',
  'The link works for the next seven days.',
  '— Eli',
];

const SAMPLE_ORDERS: Record<StoreOrderVariant, { currency: Currency; lines: StoreOrderLine[] }> = {
  'paid-and-free': {
    currency: 'EUR',
    lines: [
      { productId: 'fat-loss-30', title: '30-Day Fat Loss Plan', amount: 39 },
      { productId: 'nutritional-reset', title: 'Nutritional Reset Plan', amount: 29 },
      { productId: 'hormone-harmony-ebook', title: 'Hormone Harmony E-Book', amount: null },
    ],
  },
  'paid-only': {
    currency: 'USD',
    lines: [{ productId: 'bigger-glutes-30', title: '30-Day Bigger Glutes Plan', amount: 55 }],
  },
};

export function StoreOrder({
  variant = 'paid-and-free',
  contactEmail = DEFAULT_CONTACT_EMAIL,
  downloadUrl = '/downloads',
  termsUrl = PAID_DIGITAL_DELIVERY_CONSENT.termsHref,
}: StoreOrderProps) {
  const order = SAMPLE_ORDERS[variant];

  return (
    <EmailHtml lang="en">
      <EmailHead>
        <title>{PREVIEW_TEXT}</title>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
      </EmailHead>
      <EmailBody style={bodyStyle}>
        <EmailPreviewText>{PREVIEW_TEXT}</EmailPreviewText>
        <EmailContainer style={outerContainerStyle} maxWidth={600}>
          <EmailSection style={wordmarkSectionStyle}>
            <EmailText style={wordmarkStyle}>EVOA</EmailText>
            <EmailText style={wordmarkSubStyle}>Coaching for women</EmailText>
          </EmailSection>

          <EmailContainer style={cardStyle} maxWidth={568}>
            <EmailSection style={heroSectionStyle}>
              <EmailText style={heroEyebrowStyle}>{EYEBROW.toUpperCase()}</EmailText>
              <EmailHeading level="h1" style={heroHeadingStyle}>
                {HEADING}
              </EmailHeading>
              <div style={heroAccentRuleStyle} />
              <EmailText style={heroSubheadStyle}>{SUBHEAD}</EmailText>
            </EmailSection>

            <EmailSection style={letterSectionStyle}>
              {BODY_PARAGRAPHS.map((paragraph) => (
                <EmailText key={paragraph} style={paragraph.startsWith('—') ? signoffStyle : letterParagraphStyle}>
                  {paragraph}
                </EmailText>
              ))}
            </EmailSection>

            <EmailSection style={buttonSectionStyle}>
              <EmailLink href={downloadUrl} style={downloadButtonStyle}>
                {BUTTON_LABEL}
              </EmailLink>
            </EmailSection>

            <EmailSection style={orderOuterStyle}>
              <div style={orderCardStyle}>
                <EmailText style={orderEyebrowStyle}>YOUR ORDER</EmailText>
                <table cellPadding={0} cellSpacing={0} border={0} role="presentation" style={orderTableStyle}>
                  <tbody>
                    {order.lines.map((line) => (
                      <tr key={line.productId}>
                        <td style={lineTitleCellStyle}>{line.title}</td>
                        <td style={lineAmountCellStyle}>
                          {line.amount === null ? (
                            <span style={freeLabelStyle}>FREE</span>
                          ) : (
                            formatStorePrice(line.amount, order.currency)
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td style={totalLabelCellStyle}>{`TOTAL (${order.currency})`}</td>
                      <td style={totalAmountCellStyle}>
                        {formatStorePrice(storeOrderTotal(order.lines), order.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </EmailSection>

            <EmailSection style={consentSectionStyle}>
              <EmailText style={consentEyebrowStyle}>YOUR REQUEST FOR IMMEDIATE DELIVERY</EmailText>
              <EmailText style={consentStatementStyle}>{`“${PAID_DIGITAL_DELIVERY_CONSENT.statement}”`}</EmailText>
              <EmailText style={consentNoteStyle}>{PAID_DIGITAL_DELIVERY_CONSENT.confirmationNotice}</EmailText>
              <EmailText style={consentNoteStyle}>
                Your order is governed by{' '}
                <EmailLink href={termsUrl} style={inlineLinkStyle}>
                  {PAID_DIGITAL_DELIVERY_CONSENT.termsLinkLabel}
                </EmailLink>
                , which you accepted when you ordered.
              </EmailText>
            </EmailSection>

            <EmailDivider style={dividerStyle} />

            <EmailSection style={reassuranceSectionStyle}>
              <EmailText style={reassuranceTextStyle}>
                Stripe sends your payment receipt in a separate email.
              </EmailText>
              <EmailText style={contactLineStyle}>
                Questions? Reply to this email or write to{' '}
                <EmailLink href={`mailto:${contactEmail}`} style={inlineLinkStyle}>
                  {contactEmail}
                </EmailLink>
                .
              </EmailText>
            </EmailSection>
          </EmailContainer>

          <EmailSection style={footerSectionStyle}>
            <EmailText style={footerLineStyle}>
              You received this email because you placed an order in the Evoa Fitness store.
            </EmailText>
            <EmailText style={footerLineStyle}>
              <EmailLink href={`mailto:${contactEmail}`} style={footerLinkStyle}>
                Contact
              </EmailLink>
            </EmailText>
            <EmailText style={footerCreditStyle}>© {new Date().getFullYear()} Evoa Fitness</EmailText>
          </EmailSection>
        </EmailContainer>
      </EmailBody>
    </EmailHtml>
  );
}

StoreOrder.PreviewProps = {
  variant: 'paid-and-free',
} satisfies StoreOrderProps;

export default StoreOrder;

const bodyStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  width: '100%',
  backgroundColor: BRAND.page,
  fontFamily: FONT_SANS,
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
};

const outerContainerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '600px',
  margin: '0 auto',
  padding: '32px 16px 48px',
};

const wordmarkSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '4px 0 24px',
};

const wordmarkStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: FONT_SERIF,
  fontSize: '22px',
  fontWeight: 500,
  letterSpacing: '0.32em',
  color: BRAND.ink,
  lineHeight: 1.1,
};

const wordmarkSubStyle: React.CSSProperties = {
  margin: '6px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: BRAND.muted,
  lineHeight: 1.4,
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '568px',
  margin: '0 auto',
  backgroundColor: BRAND.white,
  borderRadius: '20px',
  border: `1px solid ${BRAND.cardBorder}`,
  overflow: 'hidden',
};

const heroSectionStyle: React.CSSProperties = {
  backgroundColor: BRAND.ink,
  padding: '48px 36px 44px',
  textAlign: 'center',
};

const heroEyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.22em',
  color: BRAND.pinkOnDark,
  fontWeight: 600,
  lineHeight: 1.4,
};

const heroHeadingStyle: React.CSSProperties = {
  margin: '14px 0 0',
  fontFamily: FONT_SERIF,
  fontSize: '40px',
  lineHeight: 1.05,
  fontWeight: 500,
  color: BRAND.white,
  letterSpacing: '-0.01em',
};

const heroAccentRuleStyle: React.CSSProperties = {
  width: '40px',
  height: '2px',
  backgroundColor: BRAND.pinkOnDark,
  margin: '20px auto 18px',
  borderRadius: '2px',
};

const heroSubheadStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: FONT_SANS,
  fontSize: '15px',
  lineHeight: 1.55,
  color: BRAND.mutedOnDark,
  fontWeight: 400,
  maxWidth: '420px',
  marginLeft: 'auto',
  marginRight: 'auto',
};

const letterSectionStyle: React.CSSProperties = {
  padding: '40px 36px 4px',
};

const letterParagraphStyle: React.CSSProperties = {
  margin: '0 0 18px',
  fontFamily: FONT_SANS,
  fontSize: '16px',
  lineHeight: 1.65,
  color: BRAND.body,
  fontWeight: 400,
};

const signoffStyle: React.CSSProperties = {
  margin: '8px 0 0',
  fontFamily: FONT_SERIF,
  fontSize: '20px',
  lineHeight: 1.4,
  color: BRAND.ink,
  fontWeight: 500,
  fontStyle: 'italic',
};

const buttonSectionStyle: React.CSSProperties = {
  padding: '24px 36px 8px',
  textAlign: 'center',
};

const downloadButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: BRAND.pink,
  color: BRAND.white,
  fontFamily: FONT_SANS,
  fontSize: '16px',
  fontWeight: 600,
  lineHeight: 1,
  padding: '18px 40px',
  borderRadius: '14px',
  textDecoration: 'none',
};

const orderOuterStyle: React.CSSProperties = {
  padding: '24px 24px 8px',
};

const orderCardStyle: React.CSSProperties = {
  padding: '24px 24px 20px',
  backgroundColor: BRAND.pinkSoft,
  border: `1px solid ${BRAND.pinkBorder}`,
  borderRadius: '16px',
};

const orderEyebrowStyle: React.CSSProperties = {
  margin: '0 0 12px',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.22em',
  color: BRAND.pink,
  fontWeight: 600,
  lineHeight: 1.4,
};

const orderTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const lineCellStyle: React.CSSProperties = {
  padding: '10px 0',
  borderBottom: `1px solid ${BRAND.pinkBorder}`,
  fontFamily: FONT_SANS,
  fontSize: '15px',
  lineHeight: 1.5,
  verticalAlign: 'top',
};

const lineTitleCellStyle: React.CSSProperties = {
  ...lineCellStyle,
  paddingRight: '16px',
  color: BRAND.inkSoft,
  fontWeight: 500,
};

const lineAmountCellStyle: React.CSSProperties = {
  ...lineCellStyle,
  textAlign: 'right',
  whiteSpace: 'nowrap',
  color: BRAND.muted,
  fontWeight: 600,
};

const freeLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  letterSpacing: '0.12em',
  color: BRAND.teal,
  fontWeight: 600,
};

const totalLabelCellStyle: React.CSSProperties = {
  padding: '14px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.16em',
  color: BRAND.muted,
  fontWeight: 600,
  lineHeight: 1.5,
};

const totalAmountCellStyle: React.CSSProperties = {
  padding: '14px 0 0',
  textAlign: 'right',
  whiteSpace: 'nowrap',
  fontFamily: FONT_SANS,
  fontSize: '18px',
  color: BRAND.ink,
  fontWeight: 600,
  lineHeight: 1.3,
};

const consentSectionStyle: React.CSSProperties = {
  padding: '24px 36px 28px',
};

const consentEyebrowStyle: React.CSSProperties = {
  margin: '0 0 10px',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.18em',
  color: BRAND.teal,
  fontWeight: 600,
  lineHeight: 1.4,
};

const consentStatementStyle: React.CSSProperties = {
  margin: '0 0 12px',
  padding: '0 0 0 14px',
  borderLeft: `2px solid ${BRAND.cardBorder}`,
  fontFamily: FONT_SANS,
  fontSize: '13px',
  lineHeight: 1.6,
  color: BRAND.body,
  fontWeight: 400,
};

const consentNoteStyle: React.CSSProperties = {
  margin: '0 0 10px',
  fontFamily: FONT_SANS,
  fontSize: '13px',
  lineHeight: 1.6,
  color: BRAND.muted,
  fontWeight: 400,
};

const inlineLinkStyle: React.CSSProperties = {
  color: BRAND.pink,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
};

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: `1px solid ${BRAND.cardBorder}`,
  margin: '0 36px',
  width: 'auto',
};

const reassuranceSectionStyle: React.CSSProperties = {
  padding: '28px 36px 36px',
  textAlign: 'center',
};

const reassuranceTextStyle: React.CSSProperties = {
  margin: '0 0 12px',
  fontFamily: FONT_SANS,
  fontSize: '14px',
  lineHeight: 1.55,
  color: BRAND.muted,
  fontWeight: 500,
};

const contactLineStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: FONT_SANS,
  fontSize: '13px',
  lineHeight: 1.55,
  color: BRAND.muted,
  fontWeight: 400,
};

const footerSectionStyle: React.CSSProperties = {
  padding: '28px 24px 0',
  textAlign: 'center',
};

const footerLineStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontFamily: FONT_SANS,
  fontSize: '12px',
  lineHeight: 1.55,
  color: BRAND.faint,
  fontWeight: 400,
};

const footerLinkStyle: React.CSSProperties = {
  color: BRAND.muted,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
};

const footerCreditStyle: React.CSSProperties = {
  margin: '12px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: BRAND.faint,
  fontWeight: 400,
};
