import type { RefundReason } from '../app/domain/coachingSubscription';
import { formatJourneyDate } from '../app/utils/journeyLabels';
import { formatEuroCents } from '../app/utils/money';
import { REFUND_REASON_LABELS } from '../app/utils/subscriptionCopy';
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

export type RefundDueProps = {
  reason?: RefundReason;
  clientName?: string;
  clientEmail?: string;
  refundCents?: number;
  dueBy?: Date;
  paidCents?: number;
  paidAt?: Date;
  cancelledAt?: Date;
  clientPageUrl?: string;
};

const BRAND = EMAIL_BRAND;
const FONT_SERIF = EMAIL_FONT_SERIF;
const FONT_SANS = EMAIL_FONT_SANS;

const DEFAULT_PAID_AT = new Date('2026-09-28T09:30:00.000Z');
const DEFAULT_CANCELLED_AT = new Date('2026-10-02T16:10:00.000Z');
const DEFAULT_DUE_BY = new Date('2026-10-16T16:10:00.000Z');

const EYEBROW = 'Coaching — refund due';
const HEADING = 'A refund is due.';
const SUBHEAD = 'Here is what to refund and by when.';
const BUTTON_LABEL = 'Open her client page';
const HOW_TO_LINE =
  'Refund the payment from your Stripe dashboard. Her client page shows it as refunded once it goes through.';

export function refundDueSubject({
  clientName,
  refundCents,
  dueBy,
}: {
  clientName: string;
  refundCents: number;
  dueBy: Date;
}): string {
  return `${clientName} cancelled — refund due ${formatEuroCents(refundCents)} by ${formatJourneyDate(dueBy)}`;
}

export function RefundDue({
  reason = 'full-refund',
  clientName = 'Jane Doe',
  clientEmail = 'jane@example.com',
  refundCents = 44700,
  dueBy = DEFAULT_DUE_BY,
  paidCents = 44700,
  paidAt = DEFAULT_PAID_AT,
  cancelledAt = DEFAULT_CANCELLED_AT,
  clientPageUrl = '/coach/clients/ac-demo-client-1',
}: RefundDueProps) {
  const subject = refundDueSubject({ clientName, refundCents, dueBy });

  return (
    <EmailHtml lang="en">
      <EmailHead>
        <title>{subject}</title>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
      </EmailHead>
      <EmailBody style={bodyStyle}>
        <EmailPreviewText>{subject}</EmailPreviewText>
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
              <EmailText style={heroSubheadStyle}>{SUBHEAD}</EmailText>
            </EmailSection>

            <EmailSection style={detailsOuterStyle}>
              <div style={detailsCardStyle}>
                <EmailText style={detailsEyebrowStyle}>WHO</EmailText>
                <EmailText style={detailsValueStyle}>{clientName}</EmailText>

                <EmailText style={detailsEyebrowStyle}>EMAIL</EmailText>
                <EmailText style={detailsValueStyle}>
                  <EmailLink href={`mailto:${clientEmail}`} style={linkStyle}>
                    {clientEmail}
                  </EmailLink>
                </EmailText>

                <EmailText style={detailsEyebrowStyle}>REFUND DUE</EmailText>
                <EmailText style={detailsValueStyle}>
                  {formatEuroCents(refundCents)}
                </EmailText>

                <EmailText style={detailsEyebrowStyle}>REFUND BY</EmailText>
                <EmailText style={detailsValueStyle}>
                  {formatJourneyDate(dueBy)}
                </EmailText>

                <EmailText style={detailsEyebrowStyle}>WHY</EmailText>
                <EmailText style={detailsValueStyle}>
                  {REFUND_REASON_LABELS[reason]}
                </EmailText>

                <EmailText style={detailsEyebrowStyle}>PAID</EmailText>
                <EmailText style={detailsValueStyle}>
                  {`${formatEuroCents(paidCents)} on ${formatJourneyDate(paidAt)}`}
                </EmailText>

                <EmailText style={detailsEyebrowStyle}>CANCELLED</EmailText>
                <EmailText style={detailsValueStyle}>
                  {formatJourneyDate(cancelledAt)}
                </EmailText>
              </div>
            </EmailSection>

            <EmailSection style={buttonSectionStyle}>
              <EmailLink href={clientPageUrl} style={primaryButtonStyle}>
                {BUTTON_LABEL}
              </EmailLink>
            </EmailSection>

            <EmailDivider style={dividerStyle} />

            <EmailSection style={howToSectionStyle}>
              <EmailText style={howToTextStyle}>{HOW_TO_LINE}</EmailText>
            </EmailSection>
          </EmailContainer>

          <EmailSection style={footerSectionStyle}>
            <EmailText style={footerLineStyle}>
              You received this email because a client cancelled her coaching
              within 14 days of paying.
            </EmailText>
            <EmailText style={footerCreditStyle}>
              © {new Date().getFullYear()} Evoa Fitness
            </EmailText>
          </EmailSection>
        </EmailContainer>
      </EmailBody>
    </EmailHtml>
  );
}

RefundDue.PreviewProps = {
  reason: 'full-refund',
} satisfies RefundDueProps;

export default RefundDue;

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
  color: '#D9D9D9',
  fontWeight: 400,
  maxWidth: '420px',
  marginLeft: 'auto',
  marginRight: 'auto',
};

const detailsOuterStyle: React.CSSProperties = {
  padding: '32px 24px 8px',
};

const detailsCardStyle: React.CSSProperties = {
  padding: '28px 28px 16px',
  backgroundColor: BRAND.pinkSoft,
  border: `1px solid ${BRAND.pinkBorder}`,
  borderRadius: '16px',
};

const detailsEyebrowStyle: React.CSSProperties = {
  margin: '0 0 4px',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.22em',
  color: BRAND.pink,
  fontWeight: 600,
  lineHeight: 1.4,
};

const detailsValueStyle: React.CSSProperties = {
  margin: '0 0 18px',
  fontFamily: FONT_SANS,
  fontSize: '15px',
  lineHeight: 1.55,
  color: BRAND.inkSoft,
  fontWeight: 500,
};

const linkStyle: React.CSSProperties = {
  color: BRAND.pink,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
};

const buttonSectionStyle: React.CSSProperties = {
  padding: '20px 36px 8px',
  textAlign: 'center',
};

const primaryButtonStyle: React.CSSProperties = {
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

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: `1px solid ${BRAND.cardBorder}`,
  margin: '28px 36px 0',
  width: 'auto',
};

const howToSectionStyle: React.CSSProperties = {
  padding: '28px 36px 36px',
  textAlign: 'center',
};

const howToTextStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: FONT_SANS,
  fontSize: '14px',
  lineHeight: 1.55,
  color: BRAND.muted,
  fontWeight: 500,
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

const footerCreditStyle: React.CSSProperties = {
  margin: '12px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: BRAND.faint,
  fontWeight: 400,
};
