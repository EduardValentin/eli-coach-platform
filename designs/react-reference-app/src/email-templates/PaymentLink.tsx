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
import {
  bundleLengthLabel,
  bundlePerMonth,
  bundleTotal,
  COACHING_BUNDLES,
} from '../app/domain/bundles';

export type PaymentLinkVariant = 'regular' | 'reduced';

export type PaymentLinkProps = {
  variant?: PaymentLinkVariant;
  clientName?: string;
  coachName?: string;
  contactEmail?: string;
  chooseUrl?: string;
  termsUrl?: string;
};

const BRAND = EMAIL_BRAND;
const FONT_SERIF = EMAIL_FONT_SERIF;
const FONT_SANS = EMAIL_FONT_SANS;

const DEFAULT_CONTACT_EMAIL = 'contact@evoa.fit';
const DEFAULT_CLIENT_NAME = 'Jane';
const DEFAULT_COACH_NAME = 'Eli';

const EYEBROW = 'Your bundles — 1-on-1 coaching';
const BUTTON_LABEL = 'Choose your bundle';

const SUBSCRIPTION_NOTE =
  'Each bundle is a subscription that renews at its own length — every 1, 3 or 6 months — and our terms apply.';

const copy: Record<
  PaymentLinkVariant,
  { previewText: string; heading: string; subhead: string; opening: string }
> = {
  regular: {
    previewText: 'Your coaching bundles — pick the one that fits.',
    heading: "Let's get you started.",
    subhead: 'Three ways to work together. Pick the one that fits your months ahead.',
    opening:
      'It was good to talk to you. Here are the three bundles we went through, so you can take your time and choose.',
  },
  reduced: {
    previewText: 'Your reduced prices are ready.',
    heading: "Let's get you started.",
    subhead: 'These are your reduced prices, held for you.',
    opening:
      "It was good to talk to you. I've put your reduced pricing on all three bundles below, so you can take your time and choose.",
  },
};

export function PaymentLink({
  variant = 'regular',
  clientName = DEFAULT_CLIENT_NAME,
  coachName = DEFAULT_COACH_NAME,
  contactEmail = DEFAULT_CONTACT_EMAIL,
  chooseUrl = '/select-bundle',
  termsUrl = '/terms',
}: PaymentLinkProps) {
  const content = copy[variant];
  const bodyParagraphs = [
    `Hi ${clientName},`,
    content.opening,
    `— ${coachName}`,
  ];

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
                {content.heading}
              </EmailHeading>
              <div style={heroAccentRuleStyle} />
              <EmailText style={heroSubheadStyle}>{content.subhead}</EmailText>
            </EmailSection>

            <EmailSection style={letterSectionStyle}>
              {bodyParagraphs.map((paragraph, i) => {
                const isSignoff = paragraph.startsWith('—');
                return (
                  <EmailText
                    key={i}
                    style={isSignoff ? signoffStyle : letterParagraphStyle}
                  >
                    {paragraph}
                  </EmailText>
                );
              })}
            </EmailSection>

            <EmailSection style={bundlesOuterStyle}>
              {COACHING_BUNDLES.map((bundle) => (
                <div key={bundle.id} style={bundleCardStyle}>
                  <EmailText style={bundleTitleStyle}>
                    {bundleLengthLabel(bundle.months)}
                  </EmailText>
                  <EmailText style={bundlePriceStyle}>
                    €{bundlePerMonth(bundle, variant)} per month
                  </EmailText>
                  <EmailText style={bundleTotalStyle}>
                    €{bundleTotal(bundle, variant)} in total
                  </EmailText>
                </div>
              ))}
            </EmailSection>

            <EmailSection style={buttonSectionStyle}>
              <EmailLink href={chooseUrl} style={chooseButtonStyle}>
                {BUTTON_LABEL}
              </EmailLink>
            </EmailSection>

            <EmailSection style={noteSectionStyle}>
              <EmailText style={noteTextStyle}>
                {SUBSCRIPTION_NOTE}{' '}
                <EmailLink href={termsUrl} style={noteLinkStyle}>
                  Read the terms
                </EmailLink>
                .
              </EmailText>
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
            <EmailText style={footerLineStyle}>
              You received this email because you had an assessment call with{' '}
              {coachName}.
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

PaymentLink.PreviewProps = {
  variant: 'regular',
} satisfies PaymentLinkProps;

export default PaymentLink;

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

const bundlesOuterStyle: React.CSSProperties = {
  padding: '24px 24px 8px',
};

const bundleCardStyle: React.CSSProperties = {
  marginBottom: '12px',
  padding: '18px 20px',
  backgroundColor: BRAND.pinkSoft,
  border: `1px solid ${BRAND.pinkBorder}`,
  borderRadius: '16px',
};

const bundleTitleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: FONT_SERIF,
  fontSize: '18px',
  fontWeight: 500,
  color: BRAND.ink,
  lineHeight: 1.3,
};

const bundlePriceStyle: React.CSSProperties = {
  margin: '6px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '15px',
  fontWeight: 600,
  color: BRAND.pink,
  lineHeight: 1.4,
};

const bundleTotalStyle: React.CSSProperties = {
  margin: '2px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '13px',
  color: BRAND.muted,
  lineHeight: 1.4,
};

const buttonSectionStyle: React.CSSProperties = {
  padding: '16px 36px 8px',
  textAlign: 'center',
};

const chooseButtonStyle: React.CSSProperties = {
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

const noteSectionStyle: React.CSSProperties = {
  padding: '16px 36px 24px',
  textAlign: 'center',
};

const noteTextStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: FONT_SANS,
  fontSize: '13px',
  lineHeight: 1.55,
  color: BRAND.muted,
  fontWeight: 400,
};

const noteLinkStyle: React.CSSProperties = {
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
