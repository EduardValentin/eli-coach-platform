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

import { PAYMENT_LINK_EMAIL_SUBSCRIPTION_NOTE } from "~/features/coaching-sales/public/coaching-sales";

import {
  bundleCardStyle,
  bundlePriceStyle,
  bundlesOuterStyle,
  bundleTitleStyle,
  bundleTotalStyle,
  buttonSectionStyle,
  contactLineStyle,
  contactLinkStyle,
  dividerStyle,
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
  reassuranceSectionStyle,
  signoffStyle,
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
      <EmailBody style={EMAIL_FRAME_STYLES.body}>
        <EmailPreviewText>{content.previewText}</EmailPreviewText>
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
              <EmailLink href={chooseUrl} style={EMAIL_PRIMARY_BUTTON_STYLE}>
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

          <EmailSection style={EMAIL_FRAME_STYLES.footerSection}>
            <EmailText style={EMAIL_FRAME_STYLES.footerLine}>
              You received this email because you had an assessment call with
              Eli.
            </EmailText>
            <EmailText style={EMAIL_FRAME_STYLES.footerCredit}>
              © {currentYear} Evoa Fitness
            </EmailText>
          </EmailSection>
        </EmailContainer>
      </EmailBody>
    </EmailHtml>
  );
}
