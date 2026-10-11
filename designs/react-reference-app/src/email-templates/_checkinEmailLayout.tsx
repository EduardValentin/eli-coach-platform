import type { CSSProperties, ReactNode } from 'react';
import {
  EMAIL_BRAND as BRAND,
  EMAIL_FONT_SANS as FONT_SANS,
  EMAIL_FONT_SERIF as FONT_SERIF,
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

export type CheckinEmailDetail = { label: string; value: string };

export type CheckinEmailLayoutProps = {
  subject: string;
  eyebrow: string;
  heading: string;
  subhead: string;
  details: CheckinEmailDetail[];
  footerLine: string;
  children?: ReactNode;
};

export function CheckinEmailLayout({
  subject,
  eyebrow,
  heading,
  subhead,
  details,
  footerLine,
  children,
}: CheckinEmailLayoutProps) {
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
                {eyebrow.toUpperCase()}
              </EmailText>
              <EmailHeading level="h1" style={heroHeadingStyle}>
                {heading}
              </EmailHeading>
              <div style={heroAccentRuleStyle} />
              <EmailText style={heroSubheadStyle}>{subhead}</EmailText>
            </EmailSection>

            <EmailSection style={detailsOuterStyle}>
              <div data-parity="email-details" style={detailsCardStyle}>
                {details.map((detail) => (
                  <div key={detail.label}>
                    <EmailText style={detailsEyebrowStyle}>
                      {detail.label}
                    </EmailText>
                    <EmailText style={detailsValueStyle}>
                      {detail.value}
                    </EmailText>
                  </div>
                ))}
              </div>
            </EmailSection>

            {children}

            <div style={cardEndStyle} />
          </EmailContainer>

          <EmailSection style={footerSectionStyle}>
            <EmailText style={footerLineStyle}>{footerLine}</EmailText>
            <EmailText style={footerCreditStyle}>
              © {new Date().getFullYear()} Evoa Fitness
            </EmailText>
          </EmailSection>
        </EmailContainer>
      </EmailBody>
    </EmailHtml>
  );
}

export function CheckinEmailButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children?: ReactNode;
}) {
  return (
    <EmailSection style={buttonSectionStyle}>
      <EmailLink href={href} style={primaryButtonStyle}>
        {label}
      </EmailLink>
      {children}
    </EmailSection>
  );
}

const CALENDAR_LABEL = 'Add to Google Calendar';
const ATTACHMENT_LINE =
  'A calendar file is attached to this email, so you can add the check-in to any calendar you use.';

export function CheckinEmailCalendarOffer({ googleCalendarUrl }: { googleCalendarUrl: string }) {
  return (
    <>
      <EmailText style={calendarLineStyle}>
        <EmailLink href={googleCalendarUrl} style={calendarLinkStyle}>
          {CALENDAR_LABEL}
        </EmailLink>
      </EmailText>
      <EmailText style={attachmentLineStyle}>{ATTACHMENT_LINE}</EmailText>
    </>
  );
}

export function CheckinEmailClosingLine({ children }: { children: string }) {
  return (
    <>
      <EmailDivider parity="email-divider" style={dividerStyle} />
      <EmailSection style={closingSectionStyle}>
        <EmailText style={closingTextStyle}>{children}</EmailText>
      </EmailSection>
    </>
  );
}

const bodyStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  width: '100%',
  backgroundColor: BRAND.page,
  fontFamily: FONT_SANS,
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
};

const outerContainerStyle: CSSProperties = {
  width: '100%',
  maxWidth: '600px',
  margin: '0 auto',
  padding: '32px 16px 48px',
};

const wordmarkSectionStyle: CSSProperties = {
  textAlign: 'center',
  padding: '4px 0 24px',
};

const wordmarkStyle: CSSProperties = {
  margin: 0,
  fontFamily: FONT_SERIF,
  fontSize: '22px',
  fontWeight: 500,
  letterSpacing: '0.32em',
  color: BRAND.ink,
  lineHeight: 1.1,
};

const wordmarkSubStyle: CSSProperties = {
  margin: '6px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: BRAND.muted,
  lineHeight: 1.4,
};

const cardStyle: CSSProperties = {
  width: '100%',
  maxWidth: '568px',
  margin: '0 auto',
  backgroundColor: BRAND.white,
  borderRadius: '20px',
  border: `1px solid ${BRAND.cardBorder}`,
  overflow: 'hidden',
};

const heroSectionStyle: CSSProperties = {
  backgroundColor: BRAND.ink,
  padding: '48px 36px 44px',
  textAlign: 'center',
};

const heroEyebrowStyle: CSSProperties = {
  margin: 0,
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.22em',
  color: BRAND.pinkOnDark,
  fontWeight: 600,
  lineHeight: 1.4,
};

const heroHeadingStyle: CSSProperties = {
  margin: '14px 0 0',
  fontFamily: FONT_SERIF,
  fontSize: '40px',
  lineHeight: 1.05,
  fontWeight: 500,
  color: BRAND.white,
  letterSpacing: '-0.01em',
};

const heroAccentRuleStyle: CSSProperties = {
  width: '40px',
  height: '2px',
  backgroundColor: BRAND.pinkOnDark,
  margin: '20px auto 18px',
  borderRadius: '2px',
};

const heroSubheadStyle: CSSProperties = {
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

const detailsOuterStyle: CSSProperties = {
  padding: '32px 24px 8px',
};

const detailsCardStyle: CSSProperties = {
  padding: '28px 28px 16px',
  backgroundColor: BRAND.pinkSoft,
  border: `1px solid ${BRAND.pinkBorder}`,
  borderRadius: '16px',
};

const detailsEyebrowStyle: CSSProperties = {
  margin: '0 0 4px',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.22em',
  color: BRAND.pink,
  fontWeight: 600,
  lineHeight: 1.4,
};

const detailsValueStyle: CSSProperties = {
  margin: '0 0 18px',
  fontFamily: FONT_SANS,
  fontSize: '15px',
  lineHeight: 1.55,
  color: BRAND.inkSoft,
  fontWeight: 500,
};

const buttonSectionStyle: CSSProperties = {
  padding: '20px 36px 8px',
  textAlign: 'center',
};

const primaryButtonStyle: CSSProperties = {
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

const dividerStyle: CSSProperties = {
  border: 'none',
  borderTop: `1px solid ${BRAND.cardBorder}`,
  margin: '28px 36px 0',
  width: 'auto',
};

const footerSectionStyle: CSSProperties = {
  padding: '28px 24px 0',
  textAlign: 'center',
};

const footerLineStyle: CSSProperties = {
  margin: '0 0 8px',
  fontFamily: FONT_SANS,
  fontSize: '12px',
  lineHeight: 1.55,
  color: BRAND.faint,
  fontWeight: 400,
};

const footerCreditStyle: CSSProperties = {
  margin: '12px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: BRAND.faint,
  fontWeight: 400,
};

const closingSectionStyle: CSSProperties = {
  padding: '28px 36px 0',
  textAlign: 'center',
};

const closingTextStyle: CSSProperties = {
  margin: 0,
  fontFamily: FONT_SANS,
  fontSize: '14px',
  lineHeight: 1.55,
  color: BRAND.muted,
  fontWeight: 500,
};

const cardEndStyle: CSSProperties = {
  height: '36px',
};

const calendarLineStyle: CSSProperties = {
  margin: '18px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '14px',
  lineHeight: 1.55,
  fontWeight: 500,
};

const calendarLinkStyle: CSSProperties = {
  color: BRAND.pink,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
};

const attachmentLineStyle: CSSProperties = {
  margin: '12px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '13px',
  lineHeight: 1.55,
  color: BRAND.muted,
  fontWeight: 400,
};
