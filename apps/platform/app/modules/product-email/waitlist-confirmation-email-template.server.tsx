import type { WaitlistOffer, WaitlistSignupPricing } from "@eli-coach-platform/domain";
import type { CSSProperties } from "react";
import { renderToStaticMarkup } from "react-dom/server";

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
} from "./email-primitives.server";

export type WaitlistConfirmationEmailContent = {
  html: string;
  subject: string;
  text: string;
};

type WaitlistConfirmationEmailOptions = {
  contactEmail: string;
  currentYear?: number;
  offer: WaitlistOffer;
  pricing: WaitlistSignupPricing;
  privacyEmail: string;
};

const waitlistConfirmationSubject = "You're on the Eli waitlist";

const BRAND = {
  body: "#4A4A4A",
  cardBorder: "#EFE6E2",
  faint: "#A6A6A6",
  ink: "#121212",
  inkSoft: "#3A3A3A",
  muted: "#7A7A7A",
  page: "#F4EFEC",
  pink: "#C81D6B",
  pinkBorder: "#F4D8E4",
  pinkSoft: "#FFF5F8",
  white: "#FFFFFF",
};

const FONT_SERIF = '"Playfair Display", Georgia, "Times New Roman", Times, serif';
const FONT_SANS =
  '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

type WaitlistConfirmationCopy = {
  bodyParagraphs: string[];
  eyebrow: string;
  heading: string;
  previewText: string;
  reassurance: string;
  subhead: string;
};

const copy: Record<WaitlistSignupPricing, WaitlistConfirmationCopy> = {
  reduced: {
    bodyParagraphs: [
      "Hi there,",
      "Thanks for jumping on the waitlist. I keep this round small on purpose — only a handful of women, so I can actually be there for each of you.",
      "Here's what happens next: when spots open, you'll get one email from me with the link, reduced pricing on every plan, reserved only for early signups, and everything you need to decide if we're a fit. No pressure either way.",
      "If you've got questions in the meantime, hit reply. I read every message.",
      "— Eli",
    ],
    eyebrow: "Waitlist — confirmed",
    heading: "You're in.",
    previewText: "You're on the list — I'll be in touch when doors open.",
    reassurance:
      "We'll send only the waitlist and marketing topics you agreed to when you joined.",
    subhead: "You'll be the first to know when doors open.",
  },
  regular: {
    bodyParagraphs: [
      "Hi there,",
      "You're on the Evoa Fitness waitlist.",
      "Reduced-price spots were already full when you joined.",
      "This signup does not include reduced pricing.",
      "We'll let you know when coaching availability opens. If you've got questions in the meantime, hit reply. I read every message.",
      "— Eli",
    ],
    eyebrow: "Waitlist — confirmed",
    heading: "You're on the waitlist.",
    previewText: "You joined the waitlist successfully. Reduced-price spots were full.",
    reassurance:
      "We'll send only the waitlist and marketing topics you agreed to when you joined.",
    subhead: "You joined successfully. Reduced-price spots were already full.",
  },
};

const expectations = [
  "A plan built around your cycle, not against it.",
  "Strength training and nutrition that actually go together.",
  "1-on-1 coaching — not a generic PDF program.",
];

export function createWaitlistConfirmationEmailContent(
  options: WaitlistConfirmationEmailOptions,
): WaitlistConfirmationEmailContent {
  const currentYear = options.currentYear ?? new Date().getFullYear();
  const contactEmail = options.contactEmail;
  const planLabel = resolveWaitlistOfferPlanLabel(options.offer);

  return {
    html: renderWaitlistConfirmationHtml({
      contactEmail,
      currentYear,
      planLabel,
      privacyEmail: options.privacyEmail,
      pricing: options.pricing,
    }),
    subject: waitlistConfirmationSubject,
    text: renderWaitlistConfirmationText({
      contactEmail,
      currentYear,
      planLabel,
      privacyEmail: options.privacyEmail,
      pricing: options.pricing,
    }),
  };
}

function renderWaitlistConfirmationHtml(options: {
  contactEmail: string;
  currentYear: number;
  planLabel: string;
  privacyEmail: string;
  pricing: WaitlistSignupPricing;
}): string {
  return `<!doctype html>${renderToStaticMarkup(
    <WaitlistConfirmationEmail
      contactEmail={options.contactEmail}
      currentYear={options.currentYear}
      planLabel={options.planLabel}
      privacyEmail={options.privacyEmail}
      pricing={options.pricing}
    />,
  )}`;
}

function renderWaitlistConfirmationText(options: {
  contactEmail: string;
  currentYear: number;
  planLabel: string;
  privacyEmail: string;
  pricing: WaitlistSignupPricing;
}): string {
  const content = copy[options.pricing];

  return [
    waitlistConfirmationSubject,
    "",
    content.heading,
    content.subhead,
    "",
    `Plan: ${options.planLabel}`,
    "",
    ...content.bodyParagraphs,
    "",
    "What you can expect:",
    ...expectations.map((expectation, index) => `${index + 1}. ${expectation}`),
    "",
    content.reassurance,
    `Questions? Reply to this email or write to ${options.contactEmail}.`,
    "",
    "You received this email because you joined the waitlist for Eli's coaching program.",
    `Unsubscribe: ${createUnsubscribeMailto(options.privacyEmail)}`,
    `Contact: mailto:${options.contactEmail}`,
    `© ${options.currentYear} Eli Personal Trainer`,
  ].join("\n");
}

function WaitlistConfirmationEmail({
  contactEmail,
  currentYear,
  planLabel,
  privacyEmail,
  pricing,
}: {
  contactEmail: string;
  currentYear: number;
  planLabel: string;
  privacyEmail: string;
  pricing: WaitlistSignupPricing;
}) {
  const content = copy[pricing];
  const unsubscribeUrl = createUnsubscribeMailto(privacyEmail);

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
            <EmailText style={wordmarkStyle}>ELI</EmailText>
            <EmailText style={wordmarkSubStyle}>Coaching for women</EmailText>
          </EmailSection>

          <EmailContainer maxWidth={568} style={cardStyle}>
            <EmailSection style={heroSectionStyle}>
              <EmailText style={heroEyebrowStyle}>{content.eyebrow.toUpperCase()}</EmailText>
              <EmailHeading level="h1" style={heroHeadingStyle}>
                {content.heading}
              </EmailHeading>
              <div style={heroAccentRuleStyle} />
              <EmailText style={heroSubheadStyle}>{content.subhead}</EmailText>
              <EmailText style={heroPlanStyle}>{planLabel}</EmailText>
            </EmailSection>

            <EmailSection style={letterSectionStyle}>
              {content.bodyParagraphs.map((paragraph) => {
                const isSignoff = paragraph.startsWith("—");

                return (
                  <EmailText
                    key={paragraph}
                    style={isSignoff ? signoffStyle : letterParagraphStyle}
                  >
                    {paragraph}
                  </EmailText>
                );
              })}
            </EmailSection>

            <EmailSection style={expectationsOuterStyle}>
              <div style={expectationsCardStyle}>
                <EmailText style={expectationsEyebrowStyle}>WHAT YOU CAN EXPECT</EmailText>
                {expectations.map((item, index) => (
                  <div key={item} style={expectationRowStyle}>
                    <EmailText style={expectationBulletStyle}>0{index + 1}</EmailText>
                    <EmailText style={expectationTextStyle}>{item}</EmailText>
                  </div>
                ))}
              </div>
            </EmailSection>

            <EmailDivider style={dividerStyle} />

            <EmailSection style={reassuranceSectionStyle}>
              <EmailText style={reassuranceTextStyle}>{content.reassurance}</EmailText>
              <EmailText style={contactLineStyle}>
                Questions? Reply to this email or write to{" "}
                <EmailLink href={`mailto:${contactEmail}`} style={contactLinkStyle}>
                  {contactEmail}
                </EmailLink>
                .
              </EmailText>
            </EmailSection>
          </EmailContainer>

          <EmailSection style={footerSectionStyle}>
            <EmailText style={footerLineStyle}>
              You received this email because you joined the waitlist for Eli's coaching program.
            </EmailText>
            <EmailText style={footerLineStyle}>
              <EmailLink href={unsubscribeUrl} style={footerLinkStyle}>
                Unsubscribe
              </EmailLink>
              {"  ·  "}
              <EmailLink href={`mailto:${contactEmail}`} style={footerLinkStyle}>
                Contact
              </EmailLink>
            </EmailText>
            <EmailText style={footerCreditStyle}>© {currentYear} Eli Personal Trainer</EmailText>
          </EmailSection>
        </EmailContainer>
      </EmailBody>
    </EmailHtml>
  );
}

function createUnsubscribeMailto(privacyEmail: string): string {
  const subject = encodeURIComponent("Unsubscribe from Eli waitlist emails");
  return `mailto:${privacyEmail}?subject=${subject}`;
}

function resolveWaitlistOfferPlanLabel(offer: WaitlistOffer): string {
  const planLabels = {
    "all-bundles": "Every coaching plan",
  } satisfies Record<WaitlistOffer["plan"], string>;

  return planLabels[offer.plan];
}

const bodyStyle: CSSProperties = {
  backgroundColor: BRAND.page,
  fontFamily: FONT_SANS,
  margin: 0,
  MozOsxFontSmoothing: "grayscale",
  padding: 0,
  WebkitFontSmoothing: "antialiased",
  width: "100%",
};

const outerContainerStyle: CSSProperties = {
  margin: "0 auto",
  maxWidth: "600px",
  padding: "32px 16px 48px",
  width: "100%",
};

const wordmarkSectionStyle: CSSProperties = {
  padding: "4px 0 24px",
  textAlign: "center",
};

const wordmarkStyle: CSSProperties = {
  color: BRAND.ink,
  fontFamily: FONT_SERIF,
  fontSize: "22px",
  fontWeight: 500,
  letterSpacing: "0.32em",
  lineHeight: 1.1,
  margin: 0,
};

const wordmarkSubStyle: CSSProperties = {
  color: BRAND.muted,
  fontFamily: FONT_SANS,
  fontSize: "11px",
  letterSpacing: "0.22em",
  lineHeight: 1.4,
  margin: "6px 0 0",
  textTransform: "uppercase",
};

const cardStyle: CSSProperties = {
  backgroundColor: BRAND.white,
  border: `1px solid ${BRAND.cardBorder}`,
  borderRadius: "20px",
  margin: "0 auto",
  maxWidth: "568px",
  overflow: "hidden",
  width: "100%",
};

const heroSectionStyle: CSSProperties = {
  backgroundColor: BRAND.ink,
  padding: "48px 36px 44px",
  textAlign: "center",
};

const heroEyebrowStyle: CSSProperties = {
  color: BRAND.pink,
  fontFamily: FONT_SANS,
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.22em",
  lineHeight: 1.4,
  margin: 0,
};

const heroHeadingStyle: CSSProperties = {
  color: BRAND.white,
  fontFamily: FONT_SERIF,
  fontSize: "40px",
  fontWeight: 500,
  letterSpacing: "-0.01em",
  lineHeight: 1.05,
  margin: "14px 0 0",
};

const heroAccentRuleStyle: CSSProperties = {
  backgroundColor: BRAND.pink,
  borderRadius: "2px",
  height: "2px",
  margin: "20px auto 18px",
  width: "40px",
};

const heroSubheadStyle: CSSProperties = {
  color: "#D9D9D9",
  fontFamily: FONT_SANS,
  fontSize: "15px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: 0,
  marginLeft: "auto",
  marginRight: "auto",
  maxWidth: "420px",
};

const heroPlanStyle: CSSProperties = {
  border: `1px solid ${BRAND.pinkBorder}`,
  borderRadius: "999px",
  color: BRAND.white,
  display: "inline-block",
  fontFamily: FONT_SANS,
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  lineHeight: 1.4,
  margin: "20px 0 0",
  padding: "7px 14px",
  textTransform: "uppercase",
};

const letterSectionStyle: CSSProperties = {
  padding: "40px 36px 12px",
};

const letterParagraphStyle: CSSProperties = {
  color: BRAND.body,
  fontFamily: FONT_SANS,
  fontSize: "16px",
  fontWeight: 400,
  lineHeight: 1.65,
  margin: "0 0 18px",
};

const signoffStyle: CSSProperties = {
  color: BRAND.ink,
  fontFamily: FONT_SERIF,
  fontSize: "20px",
  fontStyle: "italic",
  fontWeight: 500,
  lineHeight: 1.4,
  margin: "8px 0 0",
};

const expectationsOuterStyle: CSSProperties = {
  padding: "8px 24px 32px",
};

const expectationsCardStyle: CSSProperties = {
  backgroundColor: BRAND.pinkSoft,
  border: `1px solid ${BRAND.pinkBorder}`,
  borderRadius: "16px",
  padding: "28px 28px 12px",
};

const expectationsEyebrowStyle: CSSProperties = {
  color: BRAND.pink,
  fontFamily: FONT_SANS,
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.22em",
  lineHeight: 1.4,
  margin: "0 0 18px",
};

const expectationRowStyle: CSSProperties = {
  marginBottom: "14px",
};

const expectationBulletStyle: CSSProperties = {
  color: BRAND.pink,
  fontFamily: FONT_SERIF,
  fontSize: "14px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  lineHeight: 1,
  margin: "0 0 4px",
};

const expectationTextStyle: CSSProperties = {
  color: BRAND.inkSoft,
  fontFamily: FONT_SANS,
  fontSize: "15px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: 0,
};

const dividerStyle: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${BRAND.cardBorder}`,
  margin: "0 36px",
  width: "auto",
};

const reassuranceSectionStyle: CSSProperties = {
  padding: "28px 36px 36px",
  textAlign: "center",
};

const reassuranceTextStyle: CSSProperties = {
  color: BRAND.muted,
  fontFamily: FONT_SANS,
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1.55,
  margin: "0 0 12px",
};

const contactLineStyle: CSSProperties = {
  color: BRAND.muted,
  fontFamily: FONT_SANS,
  fontSize: "13px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: 0,
};

const contactLinkStyle: CSSProperties = {
  color: BRAND.pink,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

const footerSectionStyle: CSSProperties = {
  padding: "28px 24px 0",
  textAlign: "center",
};

const footerLineStyle: CSSProperties = {
  color: BRAND.faint,
  fontFamily: FONT_SANS,
  fontSize: "12px",
  fontWeight: 400,
  lineHeight: 1.55,
  margin: "0 0 8px",
};

const footerLinkStyle: CSSProperties = {
  color: BRAND.muted,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

const footerCreditStyle: CSSProperties = {
  color: BRAND.faint,
  fontFamily: FONT_SANS,
  fontSize: "11px",
  fontWeight: 400,
  letterSpacing: "0.08em",
  margin: "12px 0 0",
};
