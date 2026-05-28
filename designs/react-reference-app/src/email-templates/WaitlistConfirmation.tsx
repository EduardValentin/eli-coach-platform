import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export type WaitlistConfirmationVariant = 'signup' | 'notify';

export type WaitlistConfirmationProps = {
  variant?: WaitlistConfirmationVariant;
  contactEmail?: string;
  unsubscribeUrl?: string;
};

const DEFAULT_CONTACT_EMAIL = 'contact@elipersonaltrainer.com';

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
  signup: {
    previewText: "You're on the list — I'll be in touch when doors open.",
    eyebrow: 'Waitlist — confirmed',
    heading: "You're in.",
    subhead: "You'll be the first to know when doors open.",
    bodyParagraphs: [
      'Hi there,',
      "Thanks for jumping on the waitlist. I keep this round small on purpose — only a handful of women, so I can actually be there for each of you.",
      "Here's what happens next: when spots open, you'll get one email from me with the link, a launch discount reserved only for early signups, and everything you need to decide if we're a fit. No pressure either way.",
      "If you've got questions in the meantime, hit reply. I read every message.",
      '— Eli',
    ],
    reassurance: "No spam. One email when doors open — and that's it.",
  },
  notify: {
    previewText: "You're first in line for the next round.",
    eyebrow: 'Waitlist — full round',
    heading: "You're first in line.",
    subhead: 'This round filled up fast. The next one is yours.',
    bodyParagraphs: [
      'Hi there,',
      "This round filled up quicker than expected — but you're locked in for the next one.",
      'The minute spots open again, you’ll hear from me first. No public announcement, no sharing the link around. Just one email straight to you with everything you need to grab a spot.',
      "While you wait — if there's anything you want me to know before we (hopefully) work together, hit reply. I read every message.",
      '— Eli',
    ],
    reassurance:
      "No spam. One email when the next round opens — and that's it.",
  },
};

const expectations = [
  'A plan built around your cycle, not against it.',
  'Strength training and nutrition that actually go together.',
  '1-on-1 coaching — not a generic PDF program.',
];

export function WaitlistConfirmation({
  variant = 'signup',
  contactEmail = DEFAULT_CONTACT_EMAIL,
  unsubscribeUrl = '#',
}: WaitlistConfirmationProps) {
  const content = copy[variant];

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:ital,wght@0,500;1,500&display=swap"
        />
      </Head>
      <Preview>{content.previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={outerContainerStyle}>
          <Section style={wordmarkSectionStyle}>
            <Text style={wordmarkStyle}>ELI</Text>
            <Text style={wordmarkSubStyle}>Coaching for women</Text>
          </Section>

          <Container style={cardStyle}>
            <Section style={heroSectionStyle}>
              <Text style={heroEyebrowStyle}>
                {content.eyebrow.toUpperCase()}
              </Text>
              <Heading as="h1" style={heroHeadingStyle}>
                {content.heading}
              </Heading>
              <div style={heroAccentRuleStyle} />
              <Text style={heroSubheadStyle}>{content.subhead}</Text>
            </Section>

            <Section style={letterSectionStyle}>
              {content.bodyParagraphs.map((paragraph, i) => {
                const isSignoff = paragraph.startsWith('—');
                return (
                  <Text
                    key={i}
                    style={isSignoff ? signoffStyle : letterParagraphStyle}
                  >
                    {paragraph}
                  </Text>
                );
              })}
            </Section>

            <Section style={expectationsOuterStyle}>
              <div style={expectationsCardStyle}>
                <Text style={expectationsEyebrowStyle}>
                  WHAT YOU CAN EXPECT
                </Text>
                {expectations.map((item, i) => (
                  <div key={i} style={expectationRowStyle}>
                    <Text style={expectationBulletStyle}>0{i + 1}</Text>
                    <Text style={expectationTextStyle}>{item}</Text>
                  </div>
                ))}
              </div>
            </Section>

            <Hr style={dividerStyle} />

            <Section style={reassuranceSectionStyle}>
              <Text style={reassuranceTextStyle}>{content.reassurance}</Text>
              <Text style={contactLineStyle}>
                Questions? Reply to this email or write to{' '}
                <Link href={`mailto:${contactEmail}`} style={contactLinkStyle}>
                  {contactEmail}
                </Link>
                .
              </Text>
            </Section>
          </Container>

          <Section style={footerSectionStyle}>
            <Text style={footerLineStyle}>
              You received this email because you joined the waitlist for Eli's
              coaching program.
            </Text>
            <Text style={footerLineStyle}>
              <Link href={unsubscribeUrl} style={footerLinkStyle}>
                Unsubscribe
              </Link>
              {'  ·  '}
              <Link
                href={`mailto:${contactEmail}`}
                style={footerLinkStyle}
              >
                Contact
              </Link>
            </Text>
            <Text style={footerCreditStyle}>
              © {new Date().getFullYear()} Eli Personal Trainer
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

WaitlistConfirmation.PreviewProps = {
  variant: 'signup',
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
