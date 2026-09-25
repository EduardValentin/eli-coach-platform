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

export type PaymentReceiptVariant = 'immediate' | 'waiting';

export type PaymentReceiptProps = {
  variant?: PaymentReceiptVariant;
  clientName?: string;
  coachName?: string;
  contactEmail?: string;
  bundleLabel?: string;
  amount?: string;
};

const BRAND = EMAIL_BRAND;
const FONT_SERIF = EMAIL_FONT_SERIF;
const FONT_SANS = EMAIL_FONT_SANS;

const DEFAULT_CONTACT_EMAIL = 'contact@evoa.fit';
const DEFAULT_CLIENT_NAME = 'Jane';
const DEFAULT_COACH_NAME = 'Eli';
const DEFAULT_BUNDLE_LABEL = '3 months';
const DEFAULT_AMOUNT = '€447';

const EYEBROW = 'Payment confirmed';
const HEADING = 'Thank you — your place is booked.';
const INVITATION_LINE = 'Your invitation is on its way.';

const START_PATH_COPY: Record<PaymentReceiptVariant, string> = {
  immediate:
    'You asked to start as soon as your payment cleared, so your coach begins building your program straight away.',
  waiting:
    'You kept your 14-day right to withdraw, so Eli starts working on your program once those 14 days have passed and delivers it as soon as it is completed.',
};

const RENEWAL_TERM = 'Renews every';

const copy: Record<PaymentReceiptVariant, { previewText: string }> = {
  immediate: {
    previewText: 'Payment confirmed — your coach is on it.',
  },
  waiting: {
    previewText: 'Payment confirmed — your start date is set.',
  },
};

function Reading({ term, value }: { term: string; value: string }) {
  return (
    <div style={readingRowStyle}>
      <EmailText style={readingTermStyle}>{term}</EmailText>
      <EmailText style={readingValueStyle}>{value}</EmailText>
    </div>
  );
}

export function PaymentReceipt({
  variant = 'immediate',
  clientName = DEFAULT_CLIENT_NAME,
  coachName = DEFAULT_COACH_NAME,
  contactEmail = DEFAULT_CONTACT_EMAIL,
  bundleLabel = DEFAULT_BUNDLE_LABEL,
  amount = DEFAULT_AMOUNT,
}: PaymentReceiptProps) {
  const content = copy[variant];

  return (
    <EmailHtml lang="en">
      <EmailHead>
        <title>{content.previewText}</title>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
      </EmailHead>
      <EmailBody style={bodyStyle}>
        <EmailPreviewText>{content.previewText}</EmailPreviewText>
        <EmailContainer style={outerContainerStyle} maxWidth={600}>
          <EmailSection style={wordmarkSectionStyle}>
            <EmailText style={wordmarkStyle}>EVOA</EmailText>
            <EmailText style={wordmarkSubStyle}>Coaching for women</EmailText>
          </EmailSection>

          <EmailContainer style={cardStyle} maxWidth={568}>
            <EmailSection style={heroSectionStyle}>
              <EmailText style={heroEyebrowStyle}>
                {EYEBROW.toUpperCase()}
              </EmailText>
              <EmailHeading level="h1" style={heroHeadingStyle}>
                {HEADING}
              </EmailHeading>
              <div style={heroAccentRuleStyle} />
              <EmailText style={heroSubheadStyle}>{INVITATION_LINE}</EmailText>
            </EmailSection>

            <EmailSection style={letterSectionStyle}>
              <EmailText style={letterParagraphStyle}>
                Hi {clientName},
              </EmailText>
              <EmailText style={letterParagraphStyle}>
                {START_PATH_COPY[variant]}
              </EmailText>
              <EmailText style={signoffStyle}>— {coachName}</EmailText>
            </EmailSection>

            <EmailSection style={summaryOuterStyle}>
              <div style={summaryCardStyle}>
                <EmailText style={summaryEyebrowStyle}>WHAT YOU BOUGHT</EmailText>
                <Reading term="Bundle" value={bundleLabel} />
                <Reading term="Amount" value={amount} />
                <Reading term={RENEWAL_TERM} value={bundleLabel} />
              </div>
            </EmailSection>

            <EmailDivider style={dividerStyle} />

            <EmailSection style={reassuranceSectionStyle}>
              <EmailText style={contactLineStyle}>
                Questions? Reply to this email or write to{' '}
                <EmailLink
                  href={`mailto:${contactEmail}`}
                  style={contactLinkStyle}
                >
                  {contactEmail}
                </EmailLink>
                .
              </EmailText>
            </EmailSection>
          </EmailContainer>

          <EmailSection style={footerSectionStyle}>
            <EmailText style={footerCreditStyle}>
              © {new Date().getFullYear()} Evoa Fitness
            </EmailText>
          </EmailSection>
        </EmailContainer>
      </EmailBody>
    </EmailHtml>
  );
}

PaymentReceipt.PreviewProps = {
  variant: 'immediate',
} satisfies PaymentReceiptProps;

export default PaymentReceipt;

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
  fontSize: '36px',
  lineHeight: 1.1,
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
  color: '#D9D9D9',
  fontWeight: 400,
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

const summaryOuterStyle: React.CSSProperties = {
  padding: '24px 24px 32px',
};

const summaryCardStyle: React.CSSProperties = {
  padding: '24px 24px 8px',
  backgroundColor: BRAND.pinkSoft,
  border: `1px solid ${BRAND.pinkBorder}`,
  borderRadius: '16px',
};

const summaryEyebrowStyle: React.CSSProperties = {
  margin: '0 0 16px',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.22em',
  color: BRAND.pink,
  fontWeight: 600,
  lineHeight: 1.4,
};

const readingRowStyle: React.CSSProperties = {
  marginBottom: '14px',
};

const readingTermStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: FONT_SANS,
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: BRAND.muted,
  fontWeight: 600,
  lineHeight: 1.4,
};

const readingValueStyle: React.CSSProperties = {
  margin: '2px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '15px',
  color: BRAND.inkSoft,
  fontWeight: 500,
  lineHeight: 1.5,
};

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: `1px solid ${BRAND.cardBorder}`,
  margin: '0 36px',
  width: 'auto',
};

const reassuranceSectionStyle: React.CSSProperties = {
  padding: '24px 36px 32px',
  textAlign: 'center',
};

const contactLineStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: FONT_SANS,
  fontSize: '13px',
  lineHeight: 1.55,
  color: BRAND.muted,
  fontWeight: 400,
};

const contactLinkStyle: React.CSSProperties = {
  color: BRAND.pink,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
};

const footerSectionStyle: React.CSSProperties = {
  padding: '28px 24px 0',
  textAlign: 'center',
};

const footerCreditStyle: React.CSSProperties = {
  margin: '12px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: BRAND.faint,
  fontWeight: 400,
};
