import type { LegalDocument, LegalLink } from "./legal-document";

export const EVOA_FITNESS_PRIVACY_EMAIL = "privacy@evoa.fit";
export const PRIVACY_POLICY_VERSION = "2.0";
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

const gdprLegalObligationLink = {
  href: GDPR_URL,
  label: "Article 6(1)(c) GDPR",
  scope: "external",
} as const satisfies LegalLink;

const gdprLegitimateInterestsLink = {
  href: GDPR_URL,
  label: "Article 6(1)(f) GDPR",
  scope: "external",
} as const satisfies LegalLink;

const gdprExplicitConsentLink = {
  href: GDPR_URL,
  label: "Article 9(2)(a) GDPR",
  scope: "external",
} as const satisfies LegalLink;

const clerkPrivacyLink = {
  href: "https://clerk.com/legal/privacy",
  label: "Clerk Privacy Policy",
  scope: "external",
} as const satisfies LegalLink;

const clerkDataProcessingLink = {
  href: "https://clerk.com/legal/dpa",
  label: "Clerk Data Processing Addendum",
  scope: "external",
} as const satisfies LegalLink;

const stripePrivacyLink = {
  href: "https://stripe.com/privacy",
  label: "Stripe Privacy Policy",
  scope: "external",
} as const satisfies LegalLink;

const stripeDataProcessingLink = {
  href: "https://stripe.com/legal/dpa",
  label: "Stripe Data Processing Agreement",
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
  effectiveDate: "2026-07-27",
  title: "Privacy Policy",
  description:
    "How Evoa Fitness handles personal data for its public website, coaching waitlist, digital Store, and 1-on-1 coaching platform.",
  sections: [
    {
      id: "about-this-policy",
      heading: "About this policy",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "This Privacy Policy explains how Evoa Fitness handles personal data when you use our public website, join the coaching waitlist, book an assessment call, buy or request digital resources from the Store, or use the 1-on-1 coaching platform as a client. It is Privacy Policy version 2.0, effective 27 July 2026.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Evoa Fitness does not use advertising or analytics cookies and does not sell personal data. Signed-in areas use strictly necessary authentication cookies, described in the accounts section below.",
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
              term: "Accounts and sign-in",
              description: [
                "For the coach and invited clients: name, email address, sign-in credentials and session data managed by Clerk, and account status such as invitation and subscription state.",
              ],
            },
            {
              term: "Assessment call bookings",
              description: [
                "Name, contact details, and the requested date and time when you book an assessment call. Booking data is stored in the Evoa Fitness database.",
              ],
            },
            {
              term: "Coaching and training data",
              description: [
                "For clients: the onboarding profile (name, age, gender), unit preferences, calorie and macro targets, training goals, assigned plans, logged workouts (weights, repetitions, rest times, exercise swaps, personal records), check-in schedules, and messages exchanged with the coach.",
              ],
            },
            {
              term: "Menstrual cycle and health data",
              description: [
                "Only with your explicit consent: cycle regularity, average cycle and period lengths, health conditions, common symptoms, and period log entries with dates, flow intensity, symptoms, and optional notes.",
              ],
            },
            {
              term: "Store purchases",
              description: [
                "Order records, purchased products, billing details, and payment status. Card details go directly to Stripe and are never stored by Evoa Fitness.",
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
            "Providing personal data is voluntary. If you choose not to provide it, the only consequence is that Evoa Fitness cannot deliver the specific service that needs it — for example joining the waitlist, receiving a resource, or being coached. Evoa Fitness does not use automated decision-making, including profiling, that produces legal or similarly significant effects; waitlist pricing eligibility is allocated by submission order and remaining capacity, not by profiling.",
          ],
        },
      ],
    },
    {
      id: "accounts-and-authentication",
      heading: "Accounts and authentication through Clerk",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Client accounts are created by invitation after an assessment call. Sign-up, sign-in, and session management are handled by Clerk. Clerk processes your name, email address, credentials, and sign-in metadata; Evoa Fitness never stores passwords.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Signed-in areas use strictly necessary authentication and session cookies set by Clerk. These cookies exist only to keep you signed in securely and are not used for advertising or analytics.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Account administration is processing necessary to provide the coaching service you signed up for under ",
            gdprContractLink,
            ". Clerk processes data, primarily in the United States, under its ",
            clerkDataProcessingLink,
            " and ",
            clerkPrivacyLink,
            ", relying on the EU-US Data Privacy Framework and EU Standard Contractual Clauses where applicable.",
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
      id: "coaching-platform",
      heading: "Coaching platform, messaging, and check-ins",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "When you book an assessment call, the booking details are processed to take the steps you requested before entering a coaching agreement under ",
            gdprContractLink,
            ".",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "As a coaching client, your onboarding profile, targets, goals, plans, logged workouts, check-in schedules, and messages with the coach are processed to deliver the coaching service you purchased, also under ",
            gdprContractLink,
            ". This information is visible to you and your coach, and the platform generates system messages and notifications for plan and scheduling events.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Scheduled check-in calls take place over a third-party video service. Evoa Fitness shares the meeting link in the app; the video provider is identified in the app when you join a call and processes call data under its own privacy terms.",
          ],
        },
      ],
    },
    {
      id: "cycle-and-health-data",
      heading: "Menstrual cycle and health data",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Cycle and health information — cycle regularity, average cycle and period lengths, conditions, symptoms, and period log entries — is special-category data. Evoa Fitness processes it only with your explicit consent under ",
            gdprExplicitConsentLink,
            ", collected as a separate, dedicated step during client onboarding, and uses it only to adapt your training and nutrition guidance.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Sharing this data is optional. You receive the same level of personalized coaching without it, including when you do not currently have an active menstrual cycle. Cycle and health data is visible only to you and your coach and is never used for marketing.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "You can withdraw this consent at any time by emailing ",
            privacyEmailLink,
            ". Withdrawal stops the processing and deletes your cycle and health data, and does not affect processing that was lawful before withdrawal.",
          ],
        },
      ],
    },
    {
      id: "store-purchases-and-payments",
      heading: "Store purchases and payments through Stripe",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Paid Store products and coaching bundles are paid through Stripe. Your card details go directly to Stripe during checkout; Evoa Fitness receives the payment status and order records, never full card numbers.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Order and billing data is processed to fulfil your purchase under ",
            gdprContractLink,
            ". Invoice and accounting records are kept under ",
            gdprLegalObligationLink,
            " for the period required by Romanian accounting and fiscal law.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Stripe processes payment data, including internationally, under its ",
            stripeDataProcessingLink,
            " and ",
            stripePrivacyLink,
            ", and also acts as an independent controller for purposes such as fraud prevention as described in those terms.",
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
            "The Store cart stores only resource identifiers in the visitor's browser so the cart works between page views. No cart information reaches Evoa Fitness, Resend, or another server until the visitor submits a resource request or starts checkout.",
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
            ". Cloudflare may also process information for its independently determined Turnstile-improvement purposes as described in those terms. Turnstile may use browser mechanisms that are strictly necessary for security; Evoa Fitness does not use advertising or analytics cookies.",
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
            "Evoa Fitness uses Resend to send waitlist confirmations, account invitations, service and coaching notifications, communications covered by the visitor's marketing consent, and requested Store resources. Resend receives the recipient address, subject, HTML and text body, and delivery metadata.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "The legal basis follows the communication: consent for waitlist and marketing messages, and performance of the requested service for account, coaching, and Store delivery. These emails do not yet include an automated one-click unsubscribe. Every email includes an unsubscribe contact, and you can opt out at any time by emailing ",
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
                "The application and PostgreSQL database are hosted on Hetzner infrastructure in Germany.",
              ],
            },
            {
              term: "Clerk",
              description: [
                "Clerk provides account sign-up, sign-in, and session management, primarily involving processing in the United States under its ",
                clerkDataProcessingLink,
                " and applicable transfer safeguards.",
              ],
            },
            {
              term: "Stripe",
              description: [
                "Stripe processes payments for paid Store products and coaching bundles under its ",
                stripeDataProcessingLink,
                " and applicable transfer safeguards.",
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
              term: "Video calls",
              description: [
                "Scheduled check-in calls use a third-party video service identified in the app when you join; the provider processes call participants' data under its own terms.",
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
            [
              "Account, assessment-booking, and coaching data is retained while the account or coaching relationship is active and removed or anonymized within 24 months after it ends, unless erasure applies earlier.",
            ],
            [
              "Menstrual cycle and health data is deleted when you withdraw consent or when the account data is erased.",
            ],
            [
              "Order, invoice, and accounting records are kept for the period required by Romanian accounting and fiscal law.",
            ],
            ["Operational logs use a 30-day retention period."],
            [
              "Evoa Fitness does not persist a Turnstile token as a business record. Clerk, Stripe, Cloudflare, and Resend retain provider records under their applicable terms.",
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
            "Evoa Fitness never stores sign-in passwords or card numbers; authentication is handled by Clerk and payments by Stripe. Coaching, cycle, and health data is accessible only to you and your coach. Access to personal data is restricted to what is needed to operate the service, and processors listed in this policy handle data under their data processing agreements.",
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
