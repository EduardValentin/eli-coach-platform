import { formatCallMoment } from '../app/utils/dateFormatters';
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

export type AssessmentCallEmailVariant = 'with-notes' | 'without-notes';

export type AssessmentCallVisitorConfirmationProps = {
  variant?: AssessmentCallEmailVariant;
  visitorFirstName?: string;
  visitorEmail?: string;
  notes?: string;
  startsAt?: Date;
  timeZone?: string;
  durationMinutes?: number;
  joinUrl?: string;
  googleCalendarUrl?: string;
  contactEmail?: string;
};

const DEFAULT_CONTACT_EMAIL = 'contact@evoa.fit';
const DEFAULT_STARTS_AT = new Date('2026-03-02T15:00:00.000Z');
const DEFAULT_NOTES = 'Recovering from a knee injury, training around it.';

const PREVIEW_TEXT = 'Your free assessment call is booked.';
const EYEBROW = 'Assessment call — confirmed';
const HEADING = 'Your call is booked.';
const SUBHEAD = "Everything you need for it is in this email.";
const BUTTON_LABEL = 'Join the call';
const CALENDAR_LABEL = 'Add to Google Calendar';
const ATTACHMENT_LINE =
  'A calendar file is attached to this email, so you can add the call to any calendar you use.';

const BRAND = {
  pink: '#C81D6B',
  pinkOnDark: '#E03A7E',
  pinkSoft: '#FFF5F8',
  pinkBorder: '#F4D8E4',
  ink: '#121212',
  inkSoft: '#3A3A3A',
  body: '#4A4A4A',
  muted: '#616161',
  faint: '#6E6D6D',
  page: '#F4EFEC',
  cardBorder: '#EFE6E2',
  white: '#FFFFFF',
};

const FONT_SERIF =
  '"Playfair Display", Georgia, "Times New Roman", Times, serif';
const FONT_SANS =
  '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

export function AssessmentCallVisitorConfirmation({
  variant = 'with-notes',
  visitorFirstName = 'Jane',
  visitorEmail = 'jane@example.com',
  notes = DEFAULT_NOTES,
  startsAt = DEFAULT_STARTS_AT,
  timeZone = 'Europe/Bucharest',
  durationMinutes = 30,
  joinUrl = '/book/ac-demo/join',
  googleCalendarUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE',
  contactEmail = DEFAULT_CONTACT_EMAIL,
}: AssessmentCallVisitorConfirmationProps) {
  const showsNotes = variant === 'with-notes' && notes.trim().length > 0;

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
              <EmailText style={heroEyebrowStyle}>
                {EYEBROW.toUpperCase()}
              </EmailText>
              <EmailHeading level="h1" style={heroHeadingStyle}>
                {HEADING}
              </EmailHeading>
              <div style={heroAccentRuleStyle} />
              <EmailText style={heroSubheadStyle}>{SUBHEAD}</EmailText>
            </EmailSection>

            <EmailSection style={letterSectionStyle}>
              <EmailText style={letterParagraphStyle}>
                Hi {visitorFirstName},
              </EmailText>
              <EmailText style={letterParagraphStyle}>
                We&apos;ll talk through your goals, your training so far and
                anything getting in the way — and I&apos;ll show you how my
                coaching works, so you can decide whether it fits.
              </EmailText>
            </EmailSection>

            <EmailSection style={detailsOuterStyle}>
              <div style={detailsCardStyle}>
                <EmailText style={detailsEyebrowStyle}>WHEN</EmailText>
                <EmailText style={detailsValueStyle}>
                  {formatCallMoment(startsAt, timeZone)}
                </EmailText>

                <EmailText style={detailsEyebrowStyle}>HOW LONG</EmailText>
                <EmailText style={detailsValueStyle}>
                  {durationMinutes} minutes
                </EmailText>

                <EmailText style={detailsEyebrowStyle}>WHERE</EmailText>
                <EmailText style={detailsValueStyle}>
                  A video call — the link is right below.
                </EmailText>

                {showsNotes && (
                  <>
                    <EmailText style={detailsEyebrowStyle}>
                      WHAT YOU SHARED
                    </EmailText>
                    <EmailText style={detailsValueStyle}>{notes}</EmailText>
                  </>
                )}
              </div>
            </EmailSection>

            <EmailSection style={buttonSectionStyle}>
              <EmailLink href={joinUrl} style={primaryButtonStyle}>
                {BUTTON_LABEL}
              </EmailLink>
              <EmailText style={calendarLineStyle}>
                <EmailLink href={googleCalendarUrl} style={calendarLinkStyle}>
                  {CALENDAR_LABEL}
                </EmailLink>
              </EmailText>
              <EmailText style={attachmentLineStyle}>
                {ATTACHMENT_LINE}
              </EmailText>
            </EmailSection>

            <EmailDivider style={dividerStyle} />

            <EmailSection style={reassuranceSectionStyle}>
              <EmailText style={reassuranceTextStyle}>
                Something came up? Reply to this email and we&apos;ll find
                another time.
              </EmailText>
              <EmailText style={contactLineStyle}>
                This confirmation went to {visitorEmail}. You can also write to{' '}
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
              You received this email because you booked a free assessment call
              with Eli.
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

AssessmentCallVisitorConfirmation.PreviewProps = {
  variant: 'with-notes',
} satisfies AssessmentCallVisitorConfirmationProps;

export default AssessmentCallVisitorConfirmation;

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

const detailsOuterStyle: React.CSSProperties = {
  padding: '12px 24px 8px',
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

const calendarLineStyle: React.CSSProperties = {
  margin: '18px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '14px',
  lineHeight: 1.55,
  fontWeight: 500,
};

const calendarLinkStyle: React.CSSProperties = {
  color: BRAND.pink,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
};

const attachmentLineStyle: React.CSSProperties = {
  margin: '12px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '13px',
  lineHeight: 1.55,
  color: BRAND.muted,
  fontWeight: 400,
};

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: `1px solid ${BRAND.cardBorder}`,
  margin: '28px 36px 0',
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

const footerCreditStyle: React.CSSProperties = {
  margin: '12px 0 0',
  fontFamily: FONT_SANS,
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: BRAND.faint,
  fontWeight: 400,
};
