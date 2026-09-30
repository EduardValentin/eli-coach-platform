import {
  EMAIL_BRAND,
  EMAIL_FONT_SANS,
  EMAIL_FONT_SERIF,
  EmailBody,
  EmailContainer,
  EmailHead,
  EmailHeading,
  EmailHtml,
  EmailLink,
  EmailPreviewText,
  EmailSection,
  EmailText,
} from './_primitives';

export type DetailsRequestProps = {
  clientName?: string;
  coachName?: string;
  contactEmail?: string;
  portalUrl?: string;
};

const DEFAULT_CONTACT_EMAIL = 'contact@evoa.fit';
const DEFAULT_CLIENT_NAME = 'Jane';
const DEFAULT_COACH_NAME = 'Eli';

const BRAND = EMAIL_BRAND;
const FONT_SERIF = EMAIL_FONT_SERIF;
const FONT_SANS = EMAIL_FONT_SANS;

const SUBJECT = 'Eli needs a few more details';
const HEADING = 'A few more details';
const BODY =
  "I've gone through your answers and need a few more details before I build your program. Open your portal and you'll see what I asked.";
const BUTTON_LABEL = 'Answer now';

export function DetailsRequest({
  clientName = DEFAULT_CLIENT_NAME,
  coachName = DEFAULT_COACH_NAME,
  contactEmail = DEFAULT_CONTACT_EMAIL,
  portalUrl = '/portal',
}: DetailsRequestProps) {
  return (
    <EmailHtml lang="en">
      <EmailHead>
        <title>{SUBJECT}</title>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
      </EmailHead>
      <EmailBody style={bodyStyle}>
        <EmailPreviewText>{SUBJECT}</EmailPreviewText>
        <EmailContainer style={outerContainerStyle} maxWidth={600}>
          <EmailSection style={wordmarkSectionStyle}>
            <EmailText style={wordmarkStyle}>EVOA</EmailText>
            <EmailText style={wordmarkSubStyle}>Coaching for women</EmailText>
          </EmailSection>

          <EmailContainer style={cardStyle} maxWidth={568}>
            <EmailSection style={heroSectionStyle}>
              <EmailHeading level="h1" style={heroHeadingStyle}>
                {HEADING}
              </EmailHeading>
              <div style={heroAccentRuleStyle} />
            </EmailSection>

            <EmailSection style={letterSectionStyle}>
              <EmailText style={letterParagraphStyle}>
                {`Hi ${clientName},`}
              </EmailText>
              <EmailText style={letterParagraphStyle}>{BODY}</EmailText>
            </EmailSection>

            <EmailSection style={buttonSectionStyle}>
              <EmailLink href={portalUrl} style={answerButtonStyle}>
                {BUTTON_LABEL}
              </EmailLink>
            </EmailSection>

            <EmailSection style={signoffSectionStyle}>
              <EmailText style={signoffStyle}>{`— ${coachName}`}</EmailText>
            </EmailSection>
          </EmailContainer>

          <EmailSection style={footerSectionStyle}>
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

DetailsRequest.PreviewProps = {} satisfies DetailsRequestProps;

export default DetailsRequest;

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
  padding: '48px 36px 28px',
  textAlign: 'center',
};

const heroHeadingStyle: React.CSSProperties = {
  margin: 0,
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
  margin: '20px auto 0',
  borderRadius: '2px',
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

const buttonSectionStyle: React.CSSProperties = {
  padding: '16px 36px 8px',
  textAlign: 'center',
};

const answerButtonStyle: React.CSSProperties = {
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

const signoffSectionStyle: React.CSSProperties = {
  padding: '24px 36px 40px',
};

const signoffStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: FONT_SERIF,
  fontSize: '20px',
  lineHeight: 1.4,
  color: BRAND.ink,
  fontWeight: 500,
  fontStyle: 'italic',
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
