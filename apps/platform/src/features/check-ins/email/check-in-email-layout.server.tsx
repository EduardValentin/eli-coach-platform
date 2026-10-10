import {
  EMAIL_FRAME_STYLES,
  EMAIL_PRIMARY_BUTTON_STYLE,
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
} from "@eli-coach-platform/infrastructure/email/server";
import type { ReactNode } from "react";

import {
  attachmentLineStyle,
  buttonSectionStyle,
  calendarLineStyle,
  calendarLinkStyle,
  cardEndStyle,
  closingSectionStyle,
  closingTextStyle,
  detailsCardStyle,
  detailsEyebrowStyle,
  detailsOuterStyle,
  detailsValueStyle,
  dividerStyle,
  heroAccentRuleStyle,
  heroEyebrowStyle,
  heroHeadingStyle,
  heroSectionStyle,
  heroSubheadStyle,
} from "./check-in-email-styles.server";

type CheckInEmailDetail = { label: string; value: string };

const CALENDAR_LABEL = "Add to Google Calendar";
const ATTACHMENT_LINE =
  "A calendar file is attached to this email, so you can add the check-in to any calendar you use.";

export type CheckInEmailContent = {
  subject: string;
  eyebrow: string;
  heading: string;
  subhead: string;
  details: readonly CheckInEmailDetail[];
  footerLine: string;
  currentYear: number;
};

type CheckInEmailTextEnding = {
  actionLines: readonly string[];
  closingLine?: string;
};

type CheckInEmailLayoutProps = {
  content: CheckInEmailContent;
  children: ReactNode;
};

type CheckInEmailActionSectionProps = {
  href: string;
  label: string;
  children?: ReactNode;
};

export function CheckInEmailLayout({
  content,
  children,
}: CheckInEmailLayoutProps) {
  return (
    <EmailHtml lang="en">
      <EmailHead>
        <title>{content.subject}</title>
        <meta content="light only" name="color-scheme" />
        <meta content="light only" name="supported-color-schemes" />
      </EmailHead>
      <EmailBody style={EMAIL_FRAME_STYLES.body}>
        <EmailPreviewText>{content.subject}</EmailPreviewText>
        <EmailContainer
          maxWidth={600}
          style={EMAIL_FRAME_STYLES.outerContainer}
        >
          <EmailSection style={EMAIL_FRAME_STYLES.wordmarkSection}>
            <EmailText style={EMAIL_FRAME_STYLES.wordmark}>EVOA</EmailText>
            <EmailText style={EMAIL_FRAME_STYLES.wordmarkSub}>
              Coaching for women
            </EmailText>
          </EmailSection>

          <EmailContainer maxWidth={568} style={EMAIL_FRAME_STYLES.card}>
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

            <EmailSection style={detailsOuterStyle}>
              <div data-parity="email-details" style={detailsCardStyle}>
                {content.details.map((detail) => (
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

          <EmailSection style={EMAIL_FRAME_STYLES.footerSection}>
            <EmailText style={EMAIL_FRAME_STYLES.footerLine}>
              {content.footerLine}
            </EmailText>
            <EmailText style={EMAIL_FRAME_STYLES.footerCredit}>
              © {content.currentYear} Evoa Fitness
            </EmailText>
          </EmailSection>
        </EmailContainer>
      </EmailBody>
    </EmailHtml>
  );
}

export function CheckInEmailActionSection({
  href,
  label,
  children,
}: CheckInEmailActionSectionProps) {
  return (
    <EmailSection style={buttonSectionStyle}>
      <EmailLink href={href} style={EMAIL_PRIMARY_BUTTON_STYLE}>
        {label}
      </EmailLink>
      {children}
    </EmailSection>
  );
}

export function CheckInEmailCalendarOffer({
  googleCalendarUrl,
}: {
  googleCalendarUrl: string;
}) {
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

export function checkInEmailCalendarOfferLines(
  googleCalendarUrl: string,
): string[] {
  return [`${CALENDAR_LABEL}: ${googleCalendarUrl}`, ATTACHMENT_LINE];
}

export function CheckInEmailClosingLine({ children }: { children: string }) {
  return (
    <>
      <EmailDivider parity="email-divider" style={dividerStyle} />
      <EmailSection style={closingSectionStyle}>
        <EmailText style={closingTextStyle}>{children}</EmailText>
      </EmailSection>
    </>
  );
}

export function checkInEmailText(
  content: CheckInEmailContent,
  ending: CheckInEmailTextEnding,
): string {
  const blocks = [
    [content.heading, content.subhead],
    content.details.map(({ label, value }) => `${label}: ${value}`),
    ending.actionLines,
    ending.closingLine ? [ending.closingLine] : [],
    [content.footerLine, `© ${content.currentYear} Evoa Fitness`],
  ];

  return blocks
    .filter((lines) => lines.length > 0)
    .map((lines) => lines.join("\n"))
    .join("\n\n");
}
