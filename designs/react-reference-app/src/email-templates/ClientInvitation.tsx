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

export type ClientInvitationVariant = 'first' | 'replaced';

export type ClientInvitationProps = {
  variant?: ClientInvitationVariant;
  clientName?: string;
  coachName?: string;
  contactEmail?: string;
  acceptUrl?: string;
};

const DEFAULT_CONTACT_EMAIL = 'contact@evoa.fit';
const DEFAULT_CLIENT_NAME = 'Jane';
const DEFAULT_COACH_NAME = 'Eli';

const BRAND = {
  pink: '#C81D6B',
  pinkSoft: '#FFF5F8',
  pinkBorder: '#F4D8E4',
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

const EYEBROW = 'Invitation — 1-on-1 coaching';
const BUTTON_LABEL = 'Accept your invitation';

// Both sends promise the same onboarding, so only the lines that explain why
// this email arrived differ between them.
const SHARED_NEXT_PARAGRAPH =
  "It takes about five minutes from here — everything you need to do is below.";

const copy: Record<
  ClientInvitationVariant,
  {
    previewText: string;
    heading: string;
    subhead: string;
    opening: string;
    validity: string;
  }
> = {
  first: {
    previewText: 'Your targets are ready — accept your invitation.',
    heading: "You're all set up.",
    subhead: "Your profile and targets are ready. One tap and you're in.",
    opening:
      "I've set up your profile, your starting targets and your first goal. Everything's waiting for you — you just need to accept the invitation below.",
    validity:
      "This invitation is yours alone and works for the next 30 days. If it runs out, tell me and I'll send you a new one.",
  },
  replaced: {
    previewText: 'A fresh invitation link — use this one instead.',
    heading: "Here's your new link.",
    subhead: 'I updated your details, so the earlier invitation stopped working.',
    opening:
      'I made some changes to your profile and sent this fresh invitation. Use the button below — the link from my earlier email no longer works.',
    validity:
      "This invitation works for the next 30 days. If it runs out, tell me and I'll send you a new one.",
  },
};

const nextSteps = [
  'Tap the button and sign in with the code I email you.',
  'Answer a few questions — your cycle, your food preferences, anything I should know.',
  'Your targets and my notes are waiting in your portal.',
];

export function ClientInvitation({
  variant = 'first',
  clientName = DEFAULT_CLIENT_NAME,
  coachName = DEFAULT_COACH_NAME,
  contactEmail = DEFAULT_CONTACT_EMAIL,
  acceptUrl = '/portal/onboarding',
}: ClientInvitationProps) {
  const content = copy[variant];
  const bodyParagraphs = [
    `Hi ${clientName},`,
    content.opening,
    SHARED_NEXT_PARAGRAPH,
    content.validity,
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

            <EmailSection style={buttonSectionStyle}>
              <EmailLink href={acceptUrl} style={acceptButtonStyle}>
                {BUTTON_LABEL}
              </EmailLink>
            </EmailSection>

            <EmailSection style={nextStepsOuterStyle}>
              <div style={nextStepsCardStyle}>
                <EmailText style={nextStepsEyebrowStyle}>
                  WHAT HAPPENS NEXT
                </EmailText>
                {nextSteps.map((step, i) => (
                  <div key={i} style={nextStepRowStyle}>
                    <EmailText style={nextStepBulletStyle}>0{i + 1}</EmailText>
                    <EmailText style={nextStepTextStyle}>{step}</EmailText>
                  </div>
                ))}
              </div>
            </EmailSection>

            <EmailDivider style={dividerStyle} />

            <EmailSection style={reassuranceSectionStyle}>
              <EmailText style={reassuranceTextStyle}>
                This is your personal invitation — please don't forward it. It
                works once, on the first account that opens it.
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
              You received this email because {coachName} invited you to 1-on-1
              coaching.
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

ClientInvitation.PreviewProps = {
  variant: 'first',
} satisfies ClientInvitationProps;

export default ClientInvitation;

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

const acceptButtonStyle: React.CSSProperties = {
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

const nextStepsOuterStyle: React.CSSProperties = {
  padding: '24px 24px 32px',
};

const nextStepsCardStyle: React.CSSProperties = {
  padding: '28px 28px 12px',
  backgroundColor: BRAND.pinkSoft,
  border: `1px solid ${BRAND.pinkBorder}`,
  borderRadius: '16px',
};

const nextStepsEyebrowStyle: React.CSSProperties = {
  margin: '0 0 18px',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.22em',
  color: BRAND.pink,
  fontWeight: 600,
  lineHeight: 1.4,
};

const nextStepRowStyle: React.CSSProperties = {
  marginBottom: '16px',
};

const nextStepBulletStyle: React.CSSProperties = {
  margin: '0 0 4px',
  fontFamily: FONT_SERIF,
  fontSize: '14px',
  letterSpacing: '0.08em',
  color: BRAND.pink,
  fontWeight: 500,
  lineHeight: 1,
};

const nextStepTextStyle: React.CSSProperties = {
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
