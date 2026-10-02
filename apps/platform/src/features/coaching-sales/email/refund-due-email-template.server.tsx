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
} from "@eli-coach-platform/infrastructure/email/server";

import {
  bodyStyle,
  buttonSectionStyle,
  cardStyle,
  dividerStyle,
  footerCreditStyle,
  footerLineStyle,
  footerSectionStyle,
  heroAccentRuleStyle,
  heroEyebrowStyle,
  heroHeadingStyle,
  heroSectionStyle,
  heroSubheadStyle,
  invitationReassuranceSectionStyle,
  nextStepsCardStyle,
  nextStepsEyebrowStyle,
  nextStepsOuterStyle,
  nextStepTextStyle,
  outerContainerStyle,
  primaryButtonStyle,
  reassuranceTextStyle,
  wordmarkSectionStyle,
  wordmarkStyle,
  wordmarkSubStyle,
} from "./coaching-sales-email-styles.server";

export type RefundDueEmailDetail = {
  label: string;
  value: string;
  href?: string;
};

export type RefundDueEmailViewModel = {
  subject: string;
  details: readonly RefundDueEmailDetail[];
  clientPageUrl: string;
  currentYear: number;
};

export const REFUND_DUE_EMAIL_COPY = {
  eyebrow: "Coaching — refund due",
  heading: "A refund is due.",
  subhead: "Here is what to refund and by when.",
  buttonLabel: "Open her client page",
  howTo:
    "Refund the payment from your Stripe dashboard. Her client page shows it as refunded once it goes through.",
  footer:
    "You received this email because a client cancelled her coaching within 14 days of paying.",
} as const;

export function RefundDueEmailTemplate({
  subject,
  details,
  clientPageUrl,
  currentYear,
}: RefundDueEmailViewModel) {
  return (
    <EmailHtml lang="en">
      <EmailHead>
        <title>{subject}</title>
        <meta content="light only" name="color-scheme" />
        <meta content="light only" name="supported-color-schemes" />
      </EmailHead>
      <EmailBody style={bodyStyle}>
        <EmailPreviewText>{subject}</EmailPreviewText>
        <EmailContainer maxWidth={600} style={outerContainerStyle}>
          <EmailSection style={wordmarkSectionStyle}>
            <EmailText style={wordmarkStyle}>EVOA</EmailText>
            <EmailText style={wordmarkSubStyle}>Coaching for women</EmailText>
          </EmailSection>

          <EmailContainer maxWidth={568} style={cardStyle}>
            <EmailSection style={heroSectionStyle}>
              <EmailText style={heroEyebrowStyle}>
                {REFUND_DUE_EMAIL_COPY.eyebrow.toUpperCase()}
              </EmailText>
              <EmailHeading level="h1" style={heroHeadingStyle}>
                {REFUND_DUE_EMAIL_COPY.heading}
              </EmailHeading>
              <div style={heroAccentRuleStyle} />
              <EmailText style={heroSubheadStyle}>
                {REFUND_DUE_EMAIL_COPY.subhead}
              </EmailText>
            </EmailSection>

            <EmailSection style={nextStepsOuterStyle}>
              <div style={nextStepsCardStyle}>
                {details.map((detail) => (
                  <div key={detail.label}>
                    <EmailText style={nextStepsEyebrowStyle}>
                      {detail.label.toUpperCase()}
                    </EmailText>
                    <EmailText style={nextStepTextStyle}>
                      {detail.href ? (
                        <EmailLink href={detail.href}>{detail.value}</EmailLink>
                      ) : (
                        detail.value
                      )}
                    </EmailText>
                  </div>
                ))}
              </div>
            </EmailSection>

            <EmailSection style={buttonSectionStyle}>
              <EmailLink href={clientPageUrl} style={primaryButtonStyle}>
                {REFUND_DUE_EMAIL_COPY.buttonLabel}
              </EmailLink>
            </EmailSection>

            <EmailDivider style={dividerStyle} />

            <EmailSection style={invitationReassuranceSectionStyle}>
              <EmailText style={reassuranceTextStyle}>
                {REFUND_DUE_EMAIL_COPY.howTo}
              </EmailText>
            </EmailSection>
          </EmailContainer>

          <EmailSection style={footerSectionStyle}>
            <EmailText style={footerLineStyle}>
              {REFUND_DUE_EMAIL_COPY.footer}
            </EmailText>
            <EmailText style={footerCreditStyle}>
              © {currentYear} Evoa Fitness
            </EmailText>
          </EmailSection>
        </EmailContainer>
      </EmailBody>
    </EmailHtml>
  );
}
