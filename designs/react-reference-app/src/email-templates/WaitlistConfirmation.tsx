import {
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

export type WaitlistConfirmationVariant = 'reduced' | 'regular';

export type WaitlistConfirmationProps = {
  variant?: WaitlistConfirmationVariant;
  contactEmail?: string;
  unsubscribeUrl?: string;
};

const DEFAULT_CONTACT_EMAIL = 'contact@evoa.fit';

const BRAND = {
  pink: '#C81D6B',
  pinkSoft: '#FFF5F8',
  pinkBorder: '#F4D8E4',
  teal: '#00796B',
  ink: '#121212',
  inkSoft: '#3A3A3A',
  body: '#4A4A4A',
  muted: '#7A7A7A',
  faint: '#A6A6A6',
  page: '#F4EFEC',
  cardBorder: '#EFE6E2',
  white: '#FFFFFF',
};

const FONT_SERIF =
  '"Playfair Display", Georgia, "Times New Roman", Times, serif';
const FONT_SANS =
  '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

const copy: Record<
  WaitlistConfirmationVariant,
  {
    previewText: string;
    eyebrow: string;
    heading: string;
    subhead: string;
    bodyParagraphs: string[];
    reassurance: string;
  }
> = {
  reduced: {
    previewText: "You're on the list — I'll be in touch when doors open.",
    eyebrow: 'Waitlist — confirmed',
    heading: "You're in.",
    subhead: "You'll be the first to know when doors open.",
    bodyParagraphs: [
      'Hi there,',
      "Thanks for jumping on the waitlist. I keep this round small on purpose — only a handful of women, so I can actually be there for each of you.",
      "Here's what happens next: when spots open, you'll hear from me with the link, reduced pricing on every plan, reserved only for early signups, and everything you need to decide if we're a fit. No pressure either way.",
      "If you've got questions in the meantime, hit reply. I read every message.",
      '— Eli',
    ],
    reassurance:
      "We'll send only the waitlist and marketing topics you agreed to when you joined.",
  },
  regular: {
    previewText:
      'You joined the waitlist successfully. Reduced-price spots were full.',
    eyebrow: 'Waitlist — confirmed',
    heading: "You're on the waitlist.",
    subhead:
      'You joined successfully. Reduced-price spots were already full.',
    bodyParagraphs: [
      'Hi there,',
      "You're on the Evoa Fitness waitlist.",
      'Reduced-price spots were already full when you joined.',
      'This signup does not include reduced pricing.',
      "We'll let you know when coaching availability opens. If you've got questions in the meantime, hit reply. I read every message.",
      '— Eli',
    ],
    reassurance:
      "We'll send only the waitlist and marketing topics you agreed to when you joined.",
  },
};

const expectations = [
  'A plan built around your cycle, not against it.',
  'Strength training and nutrition that actually go together.',
  '1-on-1 coaching — not a generic PDF program.',
];

export function WaitlistConfirmation({
  variant = 'reduced',
  contactEmail = DEFAULT_CONTACT_EMAIL,
  unsubscribeUrl = '#',
}: WaitlistConfirmationProps) {
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
                {content.eyebrow.toUpperCase()}
              </EmailText>
              <EmailHeading level="h1" style={heroHeadingStyle}>
                {content.heading}
              </EmailHeading>
              <div style={heroAccentRuleStyle} />
              <EmailText style={heroSubheadStyle}>{content.subhead}</EmailText>
            </EmailSection>

            <EmailSection style={letterSectionStyle}>
              {content.bodyParagraphs.map((paragraph, i) => {
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

            <EmailSection style={expectationsOuterStyle}>
              <div style={expectationsCardStyle}>
                <EmailText style={expectationsEyebrowStyle}>
                  WHAT YOU CAN EXPECT
                </EmailText>
                {expectations.map((item, i) => (
                  <div key={i} style={expectationRowStyle}>
                    <EmailText style={expectationBulletStyle}>
                      0{i + 1}
                    </EmailText>
                    <EmailText style={expectationTextStyle}>{item}</EmailText>
                  </div>
                ))}
              </div>
            </EmailSection>

            <EmailDivider style={dividerStyle} />

            <EmailSection style={reassuranceSectionStyle}>
              <EmailText style={reassuranceTextStyle}>
                {content.reassurance}
              </EmailText>
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
              You received this email because you joined the waitlist for Eli's
              coaching program.
            </EmailText>
            <EmailText style={footerLineStyle}>
              <EmailLink href={unsubscribeUrl} style={footerLinkStyle}>
                Unsubscribe
              </EmailLink>
              {'  ·  '}
              <EmailLink
                href={`mailto:${contactEmail}`}
                style={footerLinkStyle}
              >
                Contact
              </EmailLink>
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

WaitlistConfirmation.PreviewProps = {
  variant: 'reduced',
} satisfies WaitlistConfirmationProps;

export default WaitlistConfirmation;

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
  color: BRAND.pink,
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
  backgroundColor: BRAND.pink,
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
  padding: '40px 36px 12px',
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

const expectationsOuterStyle: React.CSSProperties = {
  padding: '8px 24px 32px',
};

const expectationsCardStyle: React.CSSProperties = {
  padding: '28px 28px 12px',
  backgroundColor: BRAND.pinkSoft,
  border: `1px solid ${BRAND.pinkBorder}`,
  borderRadius: '16px',
};

const expectationsEyebrowStyle: React.CSSProperties = {
  margin: '0 0 18px',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.22em',
  color: BRAND.pink,
  fontWeight: 600,
  lineHeight: 1.4,
};

const expectationRowStyle: React.CSSProperties = {
  marginBottom: '14px',
};

const expectationBulletStyle: React.CSSProperties = {
  margin: '0 0 4px',
  fontFamily: FONT_SERIF,
  fontSize: '14px',
  letterSpacing: '0.08em',
  color: BRAND.pink,
  fontWeight: 500,
  lineHeight: 1,
};

const expectationTextStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: FONT_SANS,
  fontSize: '15px',
  lineHeight: 1.55,
  color: BRAND.inkSoft,
  fontWeight: 400,
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
