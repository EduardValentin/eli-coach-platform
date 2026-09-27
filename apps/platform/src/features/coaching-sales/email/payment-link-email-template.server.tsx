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
  bundleCardStyle,
  bundlePriceStyle,
  bundlesOuterStyle,
  bundleTitleStyle,
  bundleTotalStyle,
  buttonSectionStyle,
  cardStyle,
  chooseButtonStyle,
  contactLineStyle,
  contactLinkStyle,
  dividerStyle,
  footerCreditStyle,
  footerLineStyle,
  footerSectionStyle,
  heroAccentRuleStyle,
  heroEyebrowStyle,
  heroHeadingStyle,
  heroSectionStyle,
  heroSubheadStyle,
  letterParagraphStyle,
  letterSectionStyle,
  noteLinkStyle,
  noteSectionStyle,
  noteTextStyle,
  outerContainerStyle,
  reassuranceSectionStyle,
  signoffStyle,
  wordmarkSectionStyle,
  wordmarkStyle,
  wordmarkSubStyle,
} from "./coaching-sales-email-styles.server";

export type PaymentLinkEmailBundleViewModel = {
  lengthLabel: string;
  perMonth: string;
  total: string;
};

export type PaymentLinkEmailViewModel = {
  bundles: readonly PaymentLinkEmailBundleViewModel[];
  chooseUrl: string;
  contactEmail: string;
  content: {
    heading: string;
    opening: string;
    previewText: string;
    subhead: string;
  };
  currentYear: number;
  firstName: string;
  termsUrl: string;
};

const EYEBROW = "Your bundles — 1-on-1 coaching";
const BUTTON_LABEL = "Choose your bundle";
export const PAYMENT_LINK_EMAIL_SUBSCRIPTION_NOTE =
  "Each bundle is a subscription that renews at its own length — every 1, 3 or 6 months — and our terms apply.";

export function PaymentLinkEmailTemplate({
  bundles,
  chooseUrl,
  contactEmail,
  content,
  currentYear,
  firstName,
  termsUrl,
}: PaymentLinkEmailViewModel) {
  return (
    <EmailHtml lang="en">
      <EmailHead>
        <title>{content.previewText}</title>
        <meta content="light only" name="color-scheme" />
        <meta content="light only" name="supported-color-schemes" />
      </EmailHead>
      <EmailBody style={bodyStyle}>
        <EmailPreviewText>{content.previewText}</EmailPreviewText>
        <EmailContainer maxWidth={600} style={outerContainerStyle}>
          <EmailSection style={wordmarkSectionStyle}>
            <EmailText style={wordmarkStyle}>EVOA</EmailText>
            <EmailText style={wordmarkSubStyle}>Coaching for women</EmailText>
          </EmailSection>

          <EmailContainer maxWidth={568} style={cardStyle}>
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
              <EmailText style={letterParagraphStyle}>
                Hi {firstName},
              </EmailText>
              <EmailText style={letterParagraphStyle}>
                {content.opening}
              </EmailText>
              <EmailText style={signoffStyle}>— Eli</EmailText>
            </EmailSection>

            <EmailSection style={bundlesOuterStyle}>
              {bundles.map((bundle) => (
                <div key={bundle.lengthLabel} style={bundleCardStyle}>
                  <EmailText style={bundleTitleStyle}>
                    {bundle.lengthLabel}
                  </EmailText>
                  <EmailText style={bundlePriceStyle}>
                    {bundle.perMonth} per month
                  </EmailText>
                  <EmailText style={bundleTotalStyle}>
                    {bundle.total} in total
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
                {PAYMENT_LINK_EMAIL_SUBSCRIPTION_NOTE}{" "}
                <EmailLink href={termsUrl} style={noteLinkStyle}>
                  Read the terms
                </EmailLink>
                .
              </EmailText>
            </EmailSection>

            <EmailDivider style={dividerStyle} />

            <EmailSection style={reassuranceSectionStyle}>
              <EmailText style={contactLineStyle}>
                Questions? Reply to this email or write to{" "}
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
              You received this email because you had an assessment call with
              Eli.
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
