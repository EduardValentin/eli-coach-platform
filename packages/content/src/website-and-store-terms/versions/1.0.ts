import type { LegalDocument, LegalLink } from "../../legal-document";
import type { PaidDigitalDeliveryConsent } from "../types";

export const EVOA_FITNESS_TERMS_SUPPORT_EMAIL = "support@evoa.com";

const supportEmailLink = {
  href: `mailto:${EVOA_FITNESS_TERMS_SUPPORT_EMAIL}`,
  label: EVOA_FITNESS_TERMS_SUPPORT_EMAIL,
  scope: "external",
} as const satisfies LegalLink;

const privacyPolicyLink = {
  href: "/privacy",
  label: "Privacy Policy",
  scope: "internal",
} as const satisfies LegalLink;

const anpcComplaintLink = {
  href: "https://eservicii.anpc.ro/",
  label: "Romania's National Authority for Consumer Protection (ANPC)",
  scope: "external",
} as const satisfies LegalLink;

const anpcSalLink = {
  href: "https://reclamatiisal.anpc.ro/",
  label: "ANPC's Alternative Dispute Resolution service (SAL)",
  scope: "external",
} as const satisfies LegalLink;

const WEBSITE_AND_STORE_TERMS_V1_0_METADATA = {
  id: "website-and-store-terms",
  version: "1.0",
  effectiveDate: "2026-07-26",
  title: "Terms & Conditions",
  description:
    "Terms governing the Evoa Fitness website, waitlist, services, and free or paid digital Store products.",
} as const;

export const PAID_DIGITAL_DELIVERY_CONSENT_V1_0 = {
  statement:
    "I expressly request that Evoa Fitness begin supplying the digital content before the 14-day withdrawal period ends. I acknowledge that, once supply begins following this request and after Evoa Fitness provides the required contract confirmation, I lose the applicable statutory right to withdraw from this digital-content purchase. This does not affect mandatory remedies if the content is missing, defective, inaccessible, or not as described.",
  confirmationNotice:
    "Evoa Fitness confirms this express request and acknowledgement in the order confirmation and supplies the applicable Terms & Conditions as a durable PDF.",
  termsVersion: "1.0",
  termsHref: "/terms",
  termsLinkLabel: "Terms & Conditions version 1.0",
} as const satisfies PaidDigitalDeliveryConsent;

export const WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT: LegalDocument = {
  ...WEBSITE_AND_STORE_TERMS_V1_0_METADATA,
  sections: [
    {
      id: "about-these-terms",
      heading: "About these Terms",
      blocks: [
        {
          kind: "paragraph",
          content: [
            'These Terms & Conditions govern your use of the Evoa Fitness website and the features, content, waitlist, Store, digital products, accounts, and other services made available through it. In these Terms, "Evoa Fitness," "we," "us," and "our" refer to Evoa Fitness.',
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Please read these Terms before using the website or requesting or purchasing a Store product. By using the website, submitting a request, creating or using an account, or placing an order, you agree to the parts of these Terms that apply to that activity. If you do not agree, do not use the relevant feature.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "For a Store order, the product information shown before you request or purchase the product forms part of the agreement between you and Evoa Fitness. If product-specific information and these general Terms address the same subject differently, the product-specific information controls only for that product and subject. Mandatory consumer rights always prevail.",
          ],
        },
      ],
    },
    {
      id: "evoa-fitness-and-contacting-us",
      heading: "About Evoa Fitness and contacting us",
      blocks: [
        {
          kind: "paragraph",
          content: ["Evoa Fitness is a fitness and nutrition business based in Romania."],
        },
        {
          kind: "paragraph",
          content: [
            "For questions about the website, a Store product, delivery, access, an order, or a complaint, email ",
            supportEmailLink,
            ". If your message concerns an order or resource request, include the email address used and enough information to identify the product, but do not send payment-card details or passwords.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Privacy questions and rights requests are handled under the ",
            privacyPolicyLink,
            ".",
          ],
        },
      ],
    },
    {
      id: "website-and-services-covered",
      heading: "Website and services covered",
      blocks: [
        {
          kind: "paragraph",
          content: ["The website may provide:"],
        },
        {
          kind: "list",
          items: [
            ["information about Evoa Fitness, coaching, fitness, health, and nutrition;"],
            ["a coaching waitlist;"],
            ["a Store containing free or paid digital products;"],
            ["product-request, order, delivery, access, and recovery features;"],
            ["accounts or authenticated services where they are available; and"],
            ["links to third-party websites or services."],
          ],
        },
        {
          kind: "paragraph",
          content: [
            "A feature or category described in these Terms is governed by these Terms when that feature or category is made available. Describing the rules that apply to a feature does not promise that every feature, product type, format, currency option, or authenticated service is available at all times.",
          ],
        },
      ],
    },
    {
      id: "using-the-website-and-services",
      heading: "Using the website and services",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "You may use the website and services only lawfully, for their intended purpose, and in accordance with these Terms and any instructions shown with a feature or product.",
          ],
        },
        {
          kind: "paragraph",
          content: ["You must not:"],
        },
        {
          kind: "list",
          items: [
            ["interfere with, damage, overload, or disrupt the website or another person's use of it;"],
            ["attempt to bypass security, protected download access, account controls, or other technical restrictions;"],
            ["introduce malware or use the website for fraud, impersonation, unlawful activity, or abuse;"],
            ["use automated access in a way that harms the service, defeats reasonable limits, or collects information unlawfully;"],
            ["access another person's account, order, email, or protected resource without permission;"],
            ["remove ownership notices or misrepresent Evoa Fitness content as your own; or"],
            ["copy, publish, share, redistribute, license, or resell website or Store content except as expressly permitted by these Terms, the product information, or applicable law."],
          ],
        },
        {
          kind: "paragraph",
          content: [
            "We may restrict or suspend access where and to the extent reasonably necessary to protect users, rights, security, service availability, or legal compliance. That does not limit remedies or access rights that cannot legally be restricted.",
          ],
        },
      ],
    },
    {
      id: "coaching-waitlist",
      heading: "Coaching waitlist",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Submitting the waitlist form registers your interest in Evoa Fitness coaching. A successful waitlist registration, including one that receives a pricing allocation, does not create a coaching contract and does not guarantee:",
          ],
        },
        {
          kind: "list",
          items: [
            ["acceptance as a client;"],
            ["a coaching place, start date, response time, or availability;"],
            ["access to an account or coaching service;"],
            ["that an offer remains available until a later purchase."],
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Before an accepted submission's allocation is recorded, submitting the form also does not guarantee reduced pricing or any particular price.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "The waitlist may offer a limited allocation of reduced-price places. When a submission is accepted, the allocation recorded for it is either reduced-price or regular-price. A reduced-price allocation makes that submission eligible for reduced pricing on every coaching bundle covered by the same active offer. A regular-price allocation receives regular pricing. Joining remains available when reduced-price places are closed or when public availability is unavailable.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Public availability is qualitative, delayed, and not an exact or real-time count. A label displayed before or after submission does not itself determine your allocation and does not promise that a reduced-price place remains available.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Successfully processing the same email again for the same active offer does not create another place or change the existing reduced- or regular-pricing allocation. The repeat submission renews the waitlist consent recorded for that submission, restarts the applicable Privacy Policy retention period, and does not send another confirmation email. The browser uses the same general success response for a new or repeat submission so it does not reveal whether an email was already registered.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "The form wording and Privacy Policy explain the communications and personal-data processing associated with the waitlist.",
          ],
        },
      ],
    },
    {
      id: "store-products-and-product-information",
      heading: "Store products and product information",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "The Store may offer free and paid digital products in different formats, including documents, e-books, spreadsheets, or other downloadable or digitally accessible formats. This list describes possible formats and does not state that every format or product is currently published.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "The Store information for each product identifies the product actually offered, including as applicable:",
          ],
        },
        {
          kind: "list",
          items: [
            ["whether it is free or paid;"],
            ["its description and intended use;"],
            ["its file or access format;"],
            ["relevant software, device, compatibility, or usage requirements;"],
            ["the price and currency for a paid product;"],
            ["what is included;"],
            ["how it is requested, purchased, delivered, or accessed; and"],
            ["any product-specific restrictions or access period."],
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Review that information before requesting or purchasing a product. You are responsible for confirming that you can use the stated format and that the product is suitable for your intended personal use.",
          ],
        },
        {
          kind: "paragraph",
          content: ["No individual product limits the Store or these Terms to one resource or one format."],
        },
      ],
    },
    {
      id: "requesting-free-products",
      heading: "Requesting free products",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "To request a free Store product, you may need to provide a valid email address and complete the request steps shown in the Store. Required delivery communications are part of fulfilling your request and are separate from any optional marketing choice.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "We send the requested product or protected access instructions to the email address provided. You are responsible for entering an address you can access and for checking filtered, junk, or spam folders.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "When an emailed download link is used, it is valid for seven days from the time it is issued. If it expires or cannot be used, follow an access-recovery process if one is shown with the product; otherwise, email ",
            supportEmailLink,
            ". A refreshed link does not expand the product licence or permit sharing.",
          ],
        },
        {
          kind: "paragraph",
          content: ["A free price does not place a product in the public domain or transfer intellectual-property ownership."],
        },
      ],
    },
    {
      id: "paid-products-prices-and-payment",
      heading: "Paid products, prices, and payment",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "For a paid Store product you purchase, the product page and checkout show its fixed United States dollar (USD) price and fixed euro (EUR) price. The displayed price for the currency you select includes applicable tax. Your card issuer or payment provider may apply its own currency-conversion or account charges; those charges are not imposed by Evoa Fitness.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Payment for a paid product you purchase is processed through Stripe-hosted Checkout using the payment methods shown there. Stripe processes payment credentials under its own terms and privacy information.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "When placing a paid order, checkout presents an action that clearly indicates an obligation to pay. If payment does not complete, the paid product is not delivered and no completed order is confirmed.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "After a completed paid purchase, the order confirmation identifies the product, amount, currency, and Terms version applicable to the order. Digital delivery begins as described below.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "A Stripe payment receipt records the payment transaction. It is separate from any fiscal invoice or other tax document that Evoa Fitness may be legally required to issue.",
          ],
        },
      ],
    },
    {
      id: "immediate-digital-delivery-and-withdrawal",
      heading: "Immediate digital delivery and withdrawal",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Consumer law may normally provide a 14-day withdrawal period for a distance contract. When you purchase paid digital content supplied without a physical medium, we ask separately for your prior express request to begin delivery during that period and for your acknowledgement that you lose the applicable withdrawal right once delivery begins.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "If you give that express request and acknowledgement, delivery may begin immediately after successful payment. Once supply begins following valid consent, acknowledgement, and contract confirmation, the withdrawal right is lost to the extent provided by applicable law.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "Immediate delivery by itself does not remove a withdrawal right. If the legally required request, acknowledgement, or confirmation is missing, your rights remain as provided by applicable law.",
          ],
        },
        {
          kind: "paragraph",
          content: ["Loss of a withdrawal right does not remove mandatory remedies when digital content is missing, defective, inaccessible, or not as described."],
        },
      ],
    },
    {
      id: "delivery-protected-access-and-redownloads",
      heading: "Delivery, protected access, and re-downloads",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Digital products are delivered electronically using the method stated in the Store or order confirmation. Delivery may use an email, a protected download link, an account Library, or another access method identified before the order.",
          ],
        },
        {
          kind: "paragraph",
          content: [
            "When an emailed download link is used, it is valid for seven days from issue. Link expiry does not end a paid customer's durable entitlement to a purchased product. If an access-recovery or re-download process is shown, use it; otherwise, email ",
            supportEmailLink,
            " to obtain fresh protected access.",
          ],
        },
        {
          kind: "paragraph",
          content: ["You must keep protected links, account credentials, and downloaded files reasonably secure. Do not publish or share a protected link or use another customer's access."],
        },
        {
          kind: "paragraph",
          content: ["Your entitlement covers the product and version described when you ordered it. The Store information states whether later updates are included. Mandatory rights under applicable law always prevail."],
        },
        {
          kind: "paragraph",
          content: ["Temporary delivery or access failures do not remove your mandatory rights. If a product does not arrive or access does not work, contact us so we can restore access or provide the remedy required by law."],
        },
      ],
    },
    {
      id: "personal-use-licence-and-intellectual-property",
      heading: "Personal-use licence and intellectual property",
      blocks: [
        {
          kind: "paragraph",
          content: ["Evoa Fitness or its licensors retain the intellectual-property rights in the website, branding, Store products, and their contents."],
        },
        {
          kind: "paragraph",
          content: ["When you lawfully request or purchase a product, Evoa Fitness grants you a non-exclusive, non-transferable licence to access and use that product for your own personal, non-commercial purposes, subject to its Store information and these Terms. Where the product is offered as a download, the licence also permits you to download it and keep reasonable personal backup copies unless the Store information states a justified technical restriction."],
        },
        {
          kind: "paragraph",
          content: ["The personal-use licence does not permit you to:"],
        },
        {
          kind: "list",
          items: [
            ["share the product or protected access with another person;"],
            ["upload or publish it where others can access it;"],
            ["reproduce or distribute it commercially;"],
            ["sell, resell, rent, sublicense, or include it in another product or service;"],
            ["remove ownership or rights notices; or"],
            ["use Evoa Fitness names, branding, or content to suggest endorsement or authorship."],
          ],
        },
        {
          kind: "paragraph",
          content: ["Owning a durable entitlement to a paid product means you retain personal access to the purchased product in the format and through the method described for it; it does not transfer copyright or other intellectual-property ownership."],
        },
        {
          kind: "paragraph",
          content: ["Rights expressly granted by applicable law are not restricted by this licence."],
        },
      ],
    },
    {
      id: "fitness-health-and-nutrition-information",
      heading: "Fitness, health, and nutrition information",
      blocks: [
        {
          kind: "paragraph",
          content: ["Website and Store content about fitness, exercise, health, or nutrition is general educational information. It is not individualized medical advice, diagnosis, treatment, rehabilitation, or a substitute for advice from an appropriately qualified professional."],
        },
        {
          kind: "paragraph",
          content: ["People differ in health, experience, ability, circumstances, and response to exercise or nutrition. Results are not guaranteed."],
        },
        {
          kind: "paragraph",
          content: ["You remain responsible for deciding whether an activity, exercise, recommendation, or product is suitable for you. Consider obtaining professional advice before acting where your health or circumstances make that appropriate. Use suitable space, equipment, technique, and supervision, and stop an activity if you feel pain, illness, dizziness, or another concerning symptom. Seek appropriate medical or emergency help when needed."],
        },
        {
          kind: "paragraph",
          content: ["Nothing in this section excludes responsibility that cannot legally be excluded."],
        },
      ],
    },
    {
      id: "website-and-service-availability",
      heading: "Website and service availability",
      blocks: [
        {
          kind: "paragraph",
          content: ["We may maintain, correct, update, redesign, suspend, or withdraw website content or features. We may also add, update, or remove Store products. Product availability is determined by the Store information shown at the relevant time."],
        },
        {
          kind: "paragraph",
          content: ["We do not promise uninterrupted or error-free access. Maintenance, security incidents, internet or email failures, third-party services, device compatibility, or events outside reasonable control may temporarily delay or prevent access or delivery."],
        },
        {
          kind: "paragraph",
          content: ["We will take reasonable steps to restore a service or provide an appropriate alternative where required. Removing or changing a public Store listing does not by itself remove a paid customer's existing entitlement or mandatory remedies."],
        },
        {
          kind: "paragraph",
          content: ["Changes to the website do not retroactively change the Terms version applied to a completed order."],
        },
      ],
    },
    {
      id: "accounts-and-authenticated-services",
      heading: "Accounts and authenticated services",
      blocks: [
        {
          kind: "paragraph",
          content: ["Where an account or authenticated service is available, you must provide accurate information, keep credentials confidential, and notify us promptly if you believe access has been compromised."],
        },
        {
          kind: "paragraph",
          content: ["You are responsible for activity carried out using your credentials unless the activity results from something for which Evoa Fitness is responsible under applicable law."],
        },
        {
          kind: "paragraph",
          content: ["We may suspend or secure an account where reasonably necessary to investigate unauthorized access, misuse, security risk, or a breach of these Terms. We will preserve access and consumer rights where the law requires it."],
        },
      ],
    },
    {
      id: "third-party-links-and-services",
      heading: "Third-party links and services",
      blocks: [
        {
          kind: "paragraph",
          content: ["The website may link to or use third-party services, including Stripe-hosted Checkout and providers used for email or protected delivery. Third parties may apply their own terms and privacy information."],
        },
        {
          kind: "paragraph",
          content: ["We are responsible for selecting and using service providers as required by applicable law, but we do not control an independent third-party website merely because we link to it. A link is not an endorsement of all third-party content."],
        },
        {
          kind: "paragraph",
          content: ["Nothing in this section limits rights or remedies you have against Evoa Fitness for the Store contract or for third-party processing for which Evoa Fitness remains legally responsible."],
        },
      ],
    },
    {
      id: "product-problems-refunds-and-mandatory-remedies",
      heading: "Product problems, refunds, and mandatory remedies",
      blocks: [
        {
          kind: "paragraph",
          content: ["If digital content is not supplied, cannot be accessed, is defective, or materially differs from its description, email ", supportEmailLink, ". Depending on the circumstances and applicable law, remedies may include:"],
        },
        {
          kind: "list",
          items: [
            ["renewed delivery or access;"],
            ["bringing the content into conformity;"],
            ["replacement with the correct product;"],
            ["a proportionate price reduction;"],
            ["termination of the contract; or"],
            ["a refund."],
          ],
        },
        {
          kind: "paragraph",
          content: ["We do not advertise a voluntary change-of-mind refund promise for digital products after a valid withdrawal right has been lost. This does not restrict a withdrawal right that remains available or any mandatory remedy."],
        },
        {
          kind: "paragraph",
          content: ["We may consider other refund requests at our discretion. When Evoa Fitness approves a discretionary refund, the refund covers the full amount paid for that order."],
        },
        {
          kind: "paragraph",
          content: ["Mandatory consumer remedies apply regardless of this discretionary policy and may require a different or additional outcome."],
        },
      ],
    },
    {
      id: "responsibility-and-liability",
      heading: "Responsibility and liability",
      blocks: [
        {
          kind: "paragraph",
          content: ["Nothing in these Terms excludes or limits:"],
        },
        {
          kind: "list",
          items: [
            ["mandatory consumer rights;"],
            ["liability for fraud or intentional misconduct;"],
            ["liability for death or personal injury where it cannot legally be excluded; or"],
            ["any other liability or remedy that applicable law does not allow us to exclude or limit."],
          ],
        },
        {
          kind: "paragraph",
          content: ["Subject to those protections, Evoa Fitness is not responsible for loss caused by:"],
        },
        {
          kind: "list",
          items: [
            ["using a product contrary to its instructions, stated requirements, or personal-use licence;"],
            ["your failure to assess whether general fitness, health, or nutrition information is suitable for you;"],
            ["unauthorized sharing of your account, protected link, or downloaded file;"],
            ["an event outside our reasonable control where we took the steps reasonably required in the circumstances; or"],
            ["an independent third-party website or service that is not acting on our behalf."],
          ],
        },
        {
          kind: "paragraph",
          content: ["If you use the website or a Store product for business or commercial purposes contrary to the personal-use licence, Evoa Fitness is not responsible for business losses such as lost profit, revenue, opportunity, or data to the extent permitted by law."],
        },
      ],
    },
    {
      id: "privacy",
      heading: "Privacy",
      blocks: [
        {
          kind: "paragraph",
          content: ["The ", privacyPolicyLink, " explains the personal-data processing activities it currently describes. When a Store, delivery, account, or order feature requires additional privacy information, the relevant notice is presented with that feature."],
        },
        {
          kind: "paragraph",
          content: ["Agreeing to these Terms does not by itself create consent to optional marketing. Any marketing choice must be presented separately and can be withdrawn as described in the Privacy Policy."],
        },
      ],
    },
    {
      id: "questions-complaints-governing-law-and-disputes",
      heading: "Questions, complaints, governing law, and disputes",
      blocks: [
        {
          kind: "paragraph",
          content: ["Send questions or complaints to ", supportEmailLink, ". We will review the issue and try to resolve it directly. Contacting us first is not a condition of exercising a mandatory right, contacting a regulator, using an available dispute-resolution procedure, or bringing a legal claim."],
        },
        {
          kind: "paragraph",
          content: ["Consumers may submit a complaint through ", anpcComplaintLink, ". Eligible consumer disputes may also be submitted voluntarily through ", anpcSalLink, "."],
        },
        {
          kind: "paragraph",
          content: ["These Terms and contracts governed by them are subject to Romanian law. If you are a consumer habitually resident in another country, this choice does not deprive you of mandatory protections that apply under the law of that country."],
        },
        {
          kind: "paragraph",
          content: ["Disputes may be brought before the courts competent under applicable law. These Terms do not require a consumer to waive a court, regulator, complaint, or alternative-dispute right that cannot legally be waived."],
        },
      ],
    },
    {
      id: "changes-versions-and-durable-copies",
      heading: "Changes, versions, and durable copies",
      blocks: [
        {
          kind: "paragraph",
          content: ["The current Terms version and effective date are displayed at /terms."],
        },
        {
          kind: "paragraph",
          content: ["When these Terms change, Evoa Fitness publishes a new version with a new effective date. The new version governs website use from its effective date. A completed Store order remains associated with the Terms version accepted for that order, subject to later mandatory legal changes."],
        },
        {
          kind: "paragraph",
          content: ["Every published version has a corresponding immutable PDF containing the same approved title, version, effective date, and Terms. For a completed paid purchase, the order confirmation includes that PDF as a durable copy of the applicable Terms."],
        },
        {
          kind: "paragraph",
          content: ["Changing the content, publisher details, Store contract, payment or delivery rules, withdrawal wording, remedies, governing law, or dispute information requires review and a new published version."],
        },
      ],
    },
  ],
};
