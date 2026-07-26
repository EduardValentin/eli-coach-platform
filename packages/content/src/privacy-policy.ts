import type { LegalDocument, LegalLink } from "./legal-document";

export const EVOA_FITNESS_PRIVACY_EMAIL = "privacy@evoa.fit";
export const PRIVACY_POLICY_VERSION = "1.1";
export const WAITLIST_MARKETING_CONSENT_VERSION = "1.1";

export const WAITLIST_MARKETING_CONSENT = {
  beforePrivacyEmail:
    "By joining, you agree to Evoa Fitness emails about coaching, content and offers. Opt out anytime at ",
  betweenPrivacyEmailAndPolicyLink: ". ",
  privacyPolicyLinkLabel: "Privacy Policy",
  afterPrivacyPolicyLink: ".",
} as const;

const GDPR_URL = "https://eur-lex.europa.eu/eli/reg/2016/679/oj";

const privacyEmailLink = {
  href: `mailto:${EVOA_FITNESS_PRIVACY_EMAIL}`,
  label: EVOA_FITNESS_PRIVACY_EMAIL,
  scope: "external",
} as const satisfies LegalLink;

const gdprConsentLink = {
  href: GDPR_URL,
  label: "Article 6(1)(a) GDPR",
  scope: "external",
} as const satisfies LegalLink;

const gdprContractLink = {
  href: GDPR_URL,
  label: "Article 6(1)(b) GDPR",
  scope: "external",
} as const satisfies LegalLink;

const gdprLegitimateInterestsLink = {
  href: GDPR_URL,
  label: "Article 6(1)(f) GDPR",
  scope: "external",
} as const satisfies LegalLink;

const cloudflareTurnstilePrivacyLink = {
  href: "https://www.cloudflare.com/turnstile-privacy-policy/",
  label: "Cloudflare Turnstile Privacy Addendum",
  scope: "external",
} as const satisfies LegalLink;

const cloudflareDataProcessingLink = {
  href: "https://www.cloudflare.com/cloudflare-customer-dpa/",
  label: "Cloudflare Data Processing Addendum",
  scope: "external",
} as const satisfies LegalLink;

const resendDataProcessingLink = {
  href: "https://resend.com/legal/dpa",
  label: "Resend Data Processing Addendum",
  scope: "external",
} as const satisfies LegalLink;

const resendSubprocessorsLink = {
  href: "https://resend.com/legal/subprocessors",
  label: "authorized subprocessors",
  scope: "external",
} as const satisfies LegalLink;

const anspdcpComplaintGuidanceLink = {
  href: "https://www.dataprotection.ro/index.jsp?lang=en&page=Transmiterea_plangerilor_catre_ANSPDCP",
  label: "complaint guidance",
  scope: "external",
} as const satisfies LegalLink;

const privacyPageLink = {
  href: "/privacy",
  label: "/privacy",
  scope: "internal",
} as const satisfies LegalLink;

export const PRIVACY_POLICY = {
  id: "privacy-policy",
  version: PRIVACY_POLICY_VERSION,
  effectiveDate: "2026-07-26",
  title: "Privacy Policy",
  description:
    "How Evoa Fitness handles personal data for its public website, coaching waitlist, and free Store resources.",
  sections: [
    {
      id: "about-this-policy",
      heading: "About this policy",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "This Privacy Policy explains how Evoa Fitness handles personal data when you use our public website, join the coaching waitlist, or request free digital resources from the Store. It is Privacy Policy version 1.1, effective 26 July 2026.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "This version describes the Phase 1 service. In Phase 1, Evoa Fitness does not offer paid checkout, payments, or user accounts, and does not use advertising or analytics cookies. Planned later phases — including user accounts with sign-in handled by an external authentication provider, paid checkout, and coaching features — will be covered by an updated policy version published before they launch.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "The service is intended for adults. Evoa Fitness does not knowingly collect personal data from children under 16 and deletes such data on request.",
          ],
        },
      ],
    },
    {
      id: "controller-and-contact",
      heading: "Controller and contact",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Evoa Fitness, based in Romania, is the controller for the processing described in this policy.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "For privacy questions, rights requests, or withdrawal of consent, email ",
            privacyEmailLink,
            ".",
          ],
        },
      ],
    },
    {
      id: "personal-data-and-purposes",
      heading: "Personal data and purposes",
      blocks: [
        {
          kind: "definition-list",
          items: [
            {
              term: "Public website and operations",
              description: [
                "Request metadata, IP addresses in edge access logs, and hashed or otherwise pseudonymous operational identifiers used to secure, diagnose, and operate the service. Application logs record a hashed form of an email address, never the address itself.",
              ],
            },
            {
              term: "Waitlist",
              description: [
                "A normalized email address, offer and campaign, pricing eligibility (whether the signup qualified for reduced launch pricing), first-submission and resubmission times, Privacy Policy version, marketing-consent statement version, and consent time.",
              ],
            },
            {
              term: "Free Store resource requests",
              description: [
                "A normalized email address, requested resource identifiers and versions, request times and counts, delivery outcome, applicable legal versions, and any separate optional marketing choice.",
              ],
            },
            {
              term: "Anonymous cart",
              description: [
                "Resource identifiers stored in the visitor's browser. The cart does not contain an email address, consent record, raw download token, or private-file information.",
              ],
            },
            {
              term: "Abuse prevention",
              description: [
                "A Turnstile token and security signals that may include IP address, user agent, TLS or browser characteristics, site key, action, and origin.",
              ],
            },
            {
              term: "Email delivery",
              description: [
                "Recipient email address, subject, HTML and text body, and delivery metadata needed by the email provider.",
              ],
            },
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Evoa Fitness processes only the information needed for the purposes described below. Where processing relies on legitimate interests, those interests are operating and protecting a secure, reliable service without overriding the visitor's rights and freedoms.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Providing personal data is never a statutory or contractual requirement. If you choose not to provide an email address, the only consequence is that Evoa Fitness cannot add you to the waitlist or deliver a requested resource. Evoa Fitness does not use automated decision-making, including profiling, that produces legal or similarly significant effects; waitlist pricing eligibility is allocated by submission order and remaining capacity, not by profiling.",
          ],
        },
      ],
    },
    {
      id: "waitlist-and-marketing",
      heading: "Waitlist and marketing communications",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "When you submit a waitlist form, Evoa Fitness normalizes your email address and records the active offer, campaign, pricing eligibility, submission evidence, and consent versions. Submitting the form is the affirmative action by which you consent under ",
            gdprConsentLink,
            " to waitlist and marketing emails.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Those emails may cover coaching availability, Evoa Fitness launches and news, digital resources, fitness and nutrition content, and occasional promotional offers. Evoa Fitness must obtain new consent before using the address for a materially different marketing purpose.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "You can withdraw this consent at any time by emailing ",
            privacyEmailLink,
            ". Withdrawal stops both waitlist and marketing communications and does not affect processing that was lawful before withdrawal. Until an automated preference service exists, Evoa Fitness handles withdrawal manually.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Submitting the same email again for the same active offer refreshes the consent evidence and retention period. It does not create another waitlist entry, consume another reduced-price place, change the existing pricing eligibility, or trigger another confirmation email.",
          ],
        },
      ],
    },
    {
      id: "free-store-resources",
      heading: "Free Store resource requests",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "When you ask Evoa Fitness to send a free Store resource, the required email and resource-request details are processed to fulfil your request under ",
            gdprContractLink,
            ".",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Resource delivery does not depend on marketing consent. Any Store marketing choice is separate and optional, uses consent under ",
            gdprConsentLink,
            ", and can be withdrawn without affecting delivery of a resource already requested.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Technical retries, rejected requests, downloads, and later marketing-consent changes do not extend the Store identifier-retention period.",
          ],
        },
      ],
    },
    {
      id: "anonymous-cart",
      heading: "Anonymous browser-local cart",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "The free Store cart stores only resource identifiers in the visitor's browser so the cart works between page views. No cart information reaches Evoa Fitness, Resend, or another server until the visitor submits a resource request.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Cart data remains until the visitor removes an item, clears browser storage, or the application removes a resource that is no longer available. This storage is strictly necessary to provide the cart functionality the visitor requested and is used for nothing else. Evoa Fitness does not place an email address, consent evidence, raw download token, or private-file information in browser-local cart storage.",
          ],
        },
      ],
    },
    {
      id: "abuse-prevention",
      heading: "Abuse prevention through Cloudflare Turnstile",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Public forms may use Cloudflare Turnstile to distinguish legitimate submissions from automated abuse. Cloudflare's Turnstile browser component may collect security signals that include IP address, user agent, TLS or browser characteristics, site key, action, and origin.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "When you submit the form, your browser sends the generated Turnstile token to Evoa Fitness with the form data. Evoa Fitness's server then sends the token and, where available, the remote IP address to Cloudflare's Siteverify service.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Evoa Fitness uses Turnstile to protect forms, service availability, and capacity on the basis of legitimate interests under ",
            gdprLegitimateInterestsLink,
            ". Evoa Fitness verifies the token before using the submitted email and does not keep the raw Turnstile token as a business record.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Cloudflare processes Turnstile data under its ",
            cloudflareTurnstilePrivacyLink,
            " and ",
            cloudflareDataProcessingLink,
            ". Cloudflare may also process information for its independently determined Turnstile-improvement purposes as described in those terms. Turnstile may use browser mechanisms that are strictly necessary for security; Evoa Fitness does not use advertising or analytics cookies in Phase 1.",
          ],
        },
      ],
    },
    {
      id: "email-delivery",
      heading: "Transactional email delivery through Resend",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Evoa Fitness uses Resend to send waitlist confirmations, communications covered by the visitor's waitlist consent, and free Store resources when requested. Resend receives the recipient address, subject, HTML and text body, and delivery metadata.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "The legal basis follows the communication: consent for waitlist and marketing messages, and performance of the requested service for free Store delivery. These emails do not yet include an automated one-click unsubscribe. Every email includes an unsubscribe contact, and you can opt out at any time by emailing ",
            privacyEmailLink,
            ".",
          ],
        },
      ],
    },
    {
      id: "hosting-recipients-and-transfers",
      heading: "Hosting, processors, recipients, and transfers",
      blocks: [
        {
          kind: "definition-list",
          items: [
            {
              term: "Hetzner",
              description: [
                "The Phase 1 application and PostgreSQL database are hosted on Hetzner infrastructure in Germany.",
              ],
            },
            {
              term: "Cloudflare",
              description: [
                "Cloudflare receives Turnstile security data and may process it internationally under its Data Processing Addendum and transfer safeguards.",
              ],
            },
            {
              term: "Resend",
              description: [
                "Resend and its ",
                resendSubprocessorsLink,
                " support email delivery, primarily involving processing in the United States. The ",
                resendDataProcessingLink,
                " describes reliance on the EU-US Data Privacy Framework and EU Standard Contractual Clauses where applicable.",
              ],
            },
            {
              term: "Self-managed operations",
              description: [
                "Operational logs are held in Evoa Fitness-managed systems hosted in Europe.",
              ],
            },
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Evoa Fitness shares personal data only where needed for these services, a legal obligation, or the protection of legal rights. Provider terms and subprocessor lists can change; Evoa Fitness reviews material changes when updating this policy.",
          ],
        },
      ],
    },
    {
      id: "retention",
      heading: "Retention, anonymization, and logs",
      blocks: [
        {
          kind: "list",
          items: [
            [
              "Waitlist email identifiers are retained for 24 months from the latest valid submission or resubmission, unless consent is withdrawn or erasure applies earlier.",
            ],
            [
              "Free Store email identifiers are retained for 24 months from the latest accepted resource request.",
            ],
            ["Operational logs use a 30-day retention period."],
            [
              "Evoa Fitness does not persist a Turnstile token as a business record. Cloudflare and Resend retain provider records under their applicable terms.",
            ],
          ],
        },
        {
          kind: "paragraph",
          content: [
            "After an application retention period ends, Evoa Fitness removes email addresses and other reconnectable identifiers. Non-identifying consent, delivery, and aggregate history may remain. Identifiable information is kept longer only where a separate legal obligation requires it.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Scheduled anonymization is not yet automated. Evoa Fitness handles applicable withdrawal and erasure requests manually until that capability is available.",
          ],
        },
      ],
    },
    {
      id: "security",
      heading: "How personal data is protected",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Evoa Fitness limits collection to the minimum needed for each purpose described in this policy. Connections to the website are encrypted in transit. Waitlist records do not store IP addresses, and application logs record hashed identifiers rather than raw email addresses.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Access to personal data is restricted to what is needed to operate the service, and processors listed in this policy handle data under their data processing agreements.",
          ],
        },
      ],
    },
    {
      id: "your-rights",
      heading: "Your privacy rights",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Depending on the circumstances, you may ask Evoa Fitness to:",
          ],
        },
        {
          kind: "list",
          items: [
            ["give you access to your personal data;"],
            ["correct inaccurate or incomplete data;"],
            ["erase data;"],
            ["restrict processing;"],
            ["provide portable data where the right applies;"],
            [
              "stop processing based on legitimate interests where your rights prevail; and",
            ],
            ["record withdrawal of consent for future processing."],
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Right to object: where processing relies on legitimate interests, such as abuse prevention and operational logs, you may object at any time on grounds relating to your particular situation. Evoa Fitness will stop that processing unless compelling legitimate grounds override your interests, rights, and freedoms, or the processing is needed to establish, exercise, or defend legal claims.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Email ",
            privacyEmailLink,
            " to make a request. Evoa Fitness may need enough information to verify the requester and locate the relevant record. Withdrawal does not affect processing that was lawful before it was withdrawn.",
          ],
        },
      ],
    },
    {
      id: "complaints",
      heading: "Complaints to ANSPDCP",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "You may complain to Romania's National Supervisory Authority for Personal Data Processing, ANSPDCP. Its ",
            anspdcpComplaintGuidanceLink,
            " explains how to submit a complaint. You may contact Evoa Fitness first, but doing so is not a condition of contacting the authority.",
          ],
        },
      ],
    },
    {
      id: "policy-changes",
      heading: "Policy changes and versioning",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Evoa Fitness will update the version and effective date when this policy changes. A material change to the controller identity, contact details, processing purposes, providers, transfer safeguards, or retention rules requires review and a new published version before the changed processing begins.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "The version in force is available at ",
            privacyPageLink,
            ". Store and consent records reference the published version in force when the visitor acts.",
          ],
        },
      ],
    },
  ],
} as const satisfies LegalDocument;
