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

export type StoreDeliveryVariant = 'single' | 'multiple';

export type StoreDeliveryProps = {
  variant?: StoreDeliveryVariant;
  contactEmail?: string;
  downloadUrl?: string;
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

type DeliveredResource = {
  title: string;
  type: string;
};

const copy: Record<
  StoreDeliveryVariant,
  {
    previewText: string;
    eyebrow: string;
    heading: string;
    subhead: string;
    bodyParagraphs: string[];
    buttonLabel: string;
    resources: DeliveredResource[];
  }
> = {
  single: {
    previewText: 'Your guide is ready — the download is inside.',
    eyebrow: 'Store — your resources',
    heading: 'Your guide is ready.',
    subhead: 'One tap and it starts downloading.',
    bodyParagraphs: [
      'Hi there,',
      'Thanks for requesting this guide from the store. Tap the button below and your download starts right away.',
      'The link works for the next seven days. If it expires, you can request the same guide again from the store.',
      '— Eli',
    ],
    buttonLabel: 'Download your guide',
    resources: [{ title: 'Hormone Harmony E-Book', type: 'E-Books' }],
  },
  multiple: {
    previewText: 'Your resources are ready — the download is inside.',
    eyebrow: 'Store — your resources',
    heading: 'Your resources are ready.',
    subhead: 'Everything you picked, in one download.',
    bodyParagraphs: [
      'Hi there,',
      'Thanks for requesting these resources from the store. Tap the button below and your download starts right away — everything arrives together in one ZIP file.',
      'The link works for the next seven days. If it expires, you can request the same resources again from the store.',
      '— Eli',
    ],
    buttonLabel: 'Download your resources',
    resources: [
      { title: 'Hormone Harmony E-Book', type: 'E-Books' },
      { title: 'Nutrition Tips & Myths PDF', type: 'Nutrition Plans' },
      { title: '10-Day Core Challenge', type: 'Workouts' },
    ],
  },
};

export function StoreDelivery({
  variant = 'single',
  contactEmail = DEFAULT_CONTACT_EMAIL,
  downloadUrl = '/downloads',
}: StoreDeliveryProps) {
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

            <EmailSection style={buttonSectionStyle}>
              <EmailLink href={downloadUrl} style={downloadButtonStyle}>
                {content.buttonLabel}
              </EmailLink>
            </EmailSection>

            <EmailSection style={resourcesOuterStyle}>
              <div style={resourcesCardStyle}>
                <EmailText style={resourcesEyebrowStyle}>
                  WHAT'S INSIDE
                </EmailText>
                {content.resources.map((resource, i) => (
                  <div key={i} style={resourceRowStyle}>
                    <EmailText style={resourceBulletStyle}>
                      0{i + 1}
                    </EmailText>
                    <EmailText style={resourceTitleStyle}>
                      {resource.title}
                    </EmailText>
                    <EmailText style={resourceTypeStyle}>
                      {resource.type}
                    </EmailText>
                  </div>
                ))}
              </div>
            </EmailSection>

            <EmailDivider style={dividerStyle} />

            <EmailSection style={reassuranceSectionStyle}>
              <EmailText style={reassuranceTextStyle}>
                This is a delivery email for the resources you requested — no
                marketing, just your download.
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
              You received this email because you requested free resources from
              the Evoa Fitness store.
            </EmailText>
            <EmailText style={footerLineStyle}>
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

StoreDelivery.PreviewProps = {
  variant: 'single',
} satisfies StoreDeliveryProps;

export default StoreDelivery;

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
  borderRadius: '999px',
  textDecoration: 'none',
};

const resourcesOuterStyle: React.CSSProperties = {
  padding: '24px 24px 32px',
};

const resourcesCardStyle: React.CSSProperties = {
  padding: '28px 28px 12px',
  backgroundColor: BRAND.pinkSoft,
  border: `1px solid ${BRAND.pinkBorder}`,
  borderRadius: '16px',
};

const resourcesEyebrowStyle: React.CSSProperties = {
  margin: '0 0 18px',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.22em',
  color: BRAND.pink,
  fontWeight: 600,
  lineHeight: 1.4,
};

const resourceRowStyle: React.CSSProperties = {
  marginBottom: '16px',
};

const resourceBulletStyle: React.CSSProperties = {
  margin: '0 0 4px',
  fontFamily: FONT_SERIF,
  fontSize: '14px',
  letterSpacing: '0.08em',
  color: BRAND.pink,
  fontWeight: 500,
  lineHeight: 1,
};

const resourceTitleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: FONT_SANS,
  fontSize: '15px',
  lineHeight: 1.55,
  color: BRAND.inkSoft,
  fontWeight: 500,
};

const resourceTypeStyle: React.CSSProperties = {
  margin: '2px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: BRAND.muted,
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
