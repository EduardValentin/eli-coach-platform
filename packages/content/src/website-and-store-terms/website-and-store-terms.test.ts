import { describe, expect, test } from "vitest";

import { legalDocumentSha256 } from "../../tooling/canonical-legal-document";
import type { LegalDocument, LegalLink, LegalText } from "../legal-document";
import {
  CURRENT_WEBSITE_AND_STORE_TERMS,
  PAID_DIGITAL_DELIVERY_CONSENT,
  WEBSITE_AND_STORE_TERMS_CONTENT_SHA256,
  WEBSITE_AND_STORE_TERMS_PDF_ARTIFACT,
  WEBSITE_AND_STORE_TERMS_VERSION,
  WEBSITE_AND_STORE_TERMS_VERSIONS,
} from "./index";
import {
  PAID_DIGITAL_DELIVERY_CONSENT_V1_0,
  WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT,
} from "./versions/1.0";

const EXPECTED_SECTION_IDS = [
  "about-these-terms",
  "evoa-fitness-and-contacting-us",
  "website-and-services-covered",
  "using-the-website-and-services",
  "coaching-waitlist",
  "store-products-and-product-information",
  "requesting-free-products",
  "paid-products-prices-and-payment",
  "immediate-digital-delivery-and-withdrawal",
  "delivery-protected-access-and-redownloads",
  "personal-use-licence-and-intellectual-property",
  "fitness-health-and-nutrition-information",
  "website-and-service-availability",
  "accounts-and-authenticated-services",
  "third-party-links-and-services",
  "product-problems-refunds-and-mandatory-remedies",
  "responsibility-and-liability",
  "privacy",
  "questions-complaints-governing-law-and-disputes",
  "changes-versions-and-durable-copies",
] as const;

function documentSearchText(document: LegalDocument): string {
  const textFor = (content: LegalText): string =>
    content
      .map((fragment) =>
        typeof fragment === "string"
          ? fragment
          : `${fragment.label} ${fragment.href}`,
      )
      .join(" ");

  return document.sections
    .flatMap((section) =>
      section.blocks.flatMap((block) => {
        if (block.kind === "paragraph") {
          return textFor(block.content);
        }

        if (block.kind === "list") {
          return block.items.map(textFor);
        }

        return block.items.map(
          (item) => `${item.term} ${textFor(item.description)}`,
        );
      }),
    )
    .join(" ");
}

function documentLinks(document: LegalDocument): LegalLink[] {
  return document.sections.flatMap((section) =>
    section.blocks.flatMap((block) => {
      const texts =
        block.kind === "paragraph"
          ? [block.content]
          : block.kind === "list"
            ? block.items
            : block.items.map((item) => item.description);

      return texts
        .flat()
        .filter((fragment): fragment is LegalLink => typeof fragment !== "string");
    }),
  );
}

function hasOnlyNonEmptyFragments(text: LegalText): boolean {
  return (
    text.length > 0 &&
    text.every((fragment) =>
      typeof fragment === "string"
        ? fragment.trim().length > 0
        : fragment.label.trim().length > 0 && fragment.href.trim().length > 0,
    )
  );
}

describe("website and Store Terms content", () => {
  test("publishes the approved identity and ordered section contract", () => {
    // arrange
    const expectedIdentity = {
      id: "website-and-store-terms",
      version: "1.0",
      effectiveDate: "2026-07-26",
      title: "Terms & Conditions",
      description:
        "Terms governing the Evoa Fitness website, waitlist, services, and free or paid digital Store products.",
    };

    // act
    const identity = {
      id: WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT.id,
      version: WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT.version,
      effectiveDate: WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT.effectiveDate,
      title: WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT.title,
      description: WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT.description,
    };
    const sectionIds = WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT.sections.map(
      (section) => section.id,
    );

    // assert
    expect(identity).toEqual(expectedIdentity);
    expect(sectionIds).toEqual(EXPECTED_SECTION_IDS);
    expect(new Set(sectionIds).size).toBe(sectionIds.length);
  });

  test("keeps every approved section and fragment non-empty", () => {
    // arrange
    const document = WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT;

    // act
    const incompleteSections = document.sections.filter(
      (section) =>
        section.heading.trim().length === 0 ||
        section.blocks.length === 0 ||
        section.blocks.some((block) =>
          block.kind === "paragraph"
            ? !hasOnlyNonEmptyFragments(block.content)
            : block.kind === "list"
              ? block.items.length === 0 ||
                block.items.some((item) => !hasOnlyNonEmptyFragments(item))
              : block.items.length === 0 ||
                block.items.some(
                  (item) =>
                    item.term.trim().length === 0 ||
                    !hasOnlyNonEmptyFragments(item.description),
                ),
        ),
    );

    // assert
    expect(incompleteSections).toEqual([]);
  });

  test("uses the approved structured support, privacy, ANPC, and SAL links", () => {
    // arrange
    const links = documentLinks(WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT);

    // act
    const linkTargets = links.map(({ href, label, scope }) => [href, label, scope]);

    // assert
    expect(linkTargets).toEqual(
      expect.arrayContaining([
        ["mailto:support@evoa.com", "support@evoa.com", "external"],
        ["/privacy", "Privacy Policy", "internal"],
        [
          "https://eservicii.anpc.ro/",
          "Romania's National Authority for Consumer Protection (ANPC)",
          "external",
        ],
        [
          "https://reclamatiisal.anpc.ro/",
          "ANPC's Alternative Dispute Resolution service (SAL)",
          "external",
        ],
      ]),
    );
  });

  test("keeps launch terms accurate without stale or invented facts", () => {
    // arrange
    const text = documentSearchText(WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT);
    const forbiddenCopy = [
      "contact@elipersonaltrainer.com",
      "contact@evoa.com",
      "Glute Growth Guide",
    ];

    // act
    const hasProvisionallyBracketedCopy = /\[[A-Z][A-Z -]{2,}\]/.test(text);

    // assert
    expect(text).toContain("support@evoa.com");
    expect(text).toContain("fixed United States dollar (USD) price");
    expect(text).toContain("fixed euro (EUR) price");
    expect(text).toContain("Stripe-hosted Checkout");
    expect(text).toContain("valid for seven days");
    expect(text).toContain("full amount paid for that order");
    expect(text).toContain("https://eservicii.anpc.ro/");
    expect(text).toContain("https://reclamatiisal.anpc.ro/");
    for (const forbidden of forbiddenCopy) {
      expect(text).not.toContain(forbidden);
    }
    expect(hasProvisionallyBracketedCopy).toBe(false);
  });

  test("makes waitlist registration non-contractual and preserves recorded allocation on repeat submission", () => {
    // arrange
    const text = documentSearchText(WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT);

    // act
    const waitlistClauses = [
      "does not create a coaching contract",
      "eligible for reduced pricing on every coaching bundle covered by the same active offer",
      "A regular-price allocation receives regular pricing.",
      "does not create another place or change the existing reduced- or regular-pricing allocation",
      "renews the waitlist consent recorded for that submission",
      "restarts the applicable Privacy Policy retention period",
      "does not send another confirmation email",
      "same general success response for a new or repeat submission",
    ];

    // assert
    for (const clause of waitlistClauses) {
      expect(text).toContain(clause);
    }
  });

  test("describes free and paid products without naming an unpublished resource", () => {
    // arrange
    const text = documentSearchText(WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT);

    // act
    const formatClauses = [
      "free and paid digital products in different formats",
      "documents, e-books, spreadsheets",
      "does not state that every format or product is currently published",
      "No individual product limits the Store or these Terms to one resource or one format.",
    ];

    // assert
    for (const clause of formatClauses) {
      expect(text).toContain(clause);
    }
    expect(text).not.toContain("Glute Growth Guide");
  });

  test("preserves seven-day emailed-link limits and durable paid access", () => {
    // arrange
    const text = documentSearchText(WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT);

    // act
    const deliveryClauses = [
      "valid for seven days from the time it is issued",
      "follow an access-recovery process if one is shown with the product; otherwise",
      "Link expiry does not end a paid customer's durable entitlement",
      "If an access-recovery or re-download process is shown, use it; otherwise",
    ];

    // assert
    for (const clause of deliveryClauses) {
      expect(text).toContain(clause);
    }
  });

  test("covers personal-use licensing, safety, availability, accounts, and third parties", () => {
    // arrange
    const text = documentSearchText(WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT);

    // act
    const responsibilityClauses = [
      "non-exclusive, non-transferable licence",
      "own personal, non-commercial purposes",
      "not individualized medical advice",
      "Results are not guaranteed.",
      "We do not promise uninterrupted or error-free access.",
      "keep credentials confidential",
      "Third parties may apply their own terms and privacy information.",
    ];

    // assert
    for (const clause of responsibilityClauses) {
      expect(text).toContain(clause);
    }
  });

  test("sets transaction-triggered paid terms and separate immediate-delivery consent", () => {
    // arrange
    const text = documentSearchText(WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT);

    // act
    const paidClauses = [
      "fixed United States dollar (USD) price",
      "fixed euro (EUR) price",
      "includes applicable tax",
      "Stripe-hosted Checkout",
      "obligation to pay",
      "prior express request",
      "acknowledgement that you lose the applicable withdrawal right",
      "contract confirmation",
      "delivery may begin immediately after successful payment",
    ];

    // assert
    for (const clause of paidClauses) {
      expect(text).toContain(clause);
    }
  });

  test("limits discretionary refunds while preserving mandatory remedies and fiscal clarity", () => {
    // arrange
    const text = documentSearchText(WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT);

    // act
    const refundClauses = [
      "do not advertise a voluntary change-of-mind refund promise",
      "mandatory remedy",
      "full amount paid for that order",
      "separate from any fiscal invoice or other tax document",
    ];

    // assert
    for (const clause of refundClauses) {
      expect(text).toContain(clause);
    }
  });

  test("preserves Romanian consumer dispute protections", () => {
    // arrange
    const text = documentSearchText(WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT);

    // act
    const disputeClauses = [
      "subject to Romanian law",
      "mandatory protections that apply under the law of that country",
      "National Authority for Consumer Protection (ANPC)",
      "Alternative Dispute Resolution service (SAL)",
      "court, regulator, complaint, or alternative-dispute right",
    ];

    // assert
    for (const clause of disputeClauses) {
      expect(text).toContain(clause);
    }
  });

  test("requires new immutable publications while retaining completed-order versions", () => {
    // arrange
    const text = documentSearchText(WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT);

    // act
    const versionClauses = [
      "publishes a new version with a new effective date",
      "completed Store order remains associated with the Terms version accepted for that order",
      "corresponding immutable PDF",
      "requires review and a new published version",
    ];

    // assert
    for (const clause of versionClauses) {
      expect(text).toContain(clause);
    }
  });

  test("does not claim the current Privacy Policy already covers paid orders or accounts", () => {
    // arrange
    const text = documentSearchText(WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT);

    // act
    const privacyParagraph = WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT.sections.find(
      (section) => section.id === "privacy",
    );
    const privacyText = documentSearchText({
      ...WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT,
      sections: privacyParagraph ? [privacyParagraph] : [],
    });

    // assert
    expect(text).toContain("When a Store, delivery, account, or order feature requires additional privacy information");
    expect(privacyText).not.toContain("currently covers paid orders");
    expect(privacyText).not.toContain("currently covers accounts");
  });

  test("binds immediate-delivery consent to Terms version 1.0", () => {
    // arrange
    const expected = {
      statement:
        "I expressly request that Evoa Fitness begin supplying the digital content before the 14-day withdrawal period ends. I acknowledge that, once supply begins following this request and after Evoa Fitness provides the required contract confirmation, I lose the applicable statutory right to withdraw from this digital-content purchase. This does not affect mandatory remedies if the content is missing, defective, inaccessible, or not as described.",
      confirmationNotice:
        "Evoa Fitness confirms this express request and acknowledgement in the order confirmation and supplies the applicable Terms & Conditions as a durable PDF.",
      termsVersion: "1.0",
      termsHref: "/terms",
      termsLinkLabel: "Terms & Conditions version 1.0",
    };

    // act
    const consent = PAID_DIGITAL_DELIVERY_CONSENT_V1_0;

    // assert
    expect(consent).toEqual(expected);
  });

  test("publishes the current aliases from the only historical version", () => {
    // arrange
    const publishedVersion = WEBSITE_AND_STORE_TERMS_VERSIONS["1.0"];

    // act
    const aliases = {
      consent: PAID_DIGITAL_DELIVERY_CONSENT,
      contentSha256: WEBSITE_AND_STORE_TERMS_CONTENT_SHA256,
      current: CURRENT_WEBSITE_AND_STORE_TERMS,
      pdfArtifact: WEBSITE_AND_STORE_TERMS_PDF_ARTIFACT,
      version: WEBSITE_AND_STORE_TERMS_VERSION,
    };

    // assert
    expect(Object.keys(WEBSITE_AND_STORE_TERMS_VERSIONS)).toEqual(["1.0"]);
    expect(aliases.current).toBe(publishedVersion);
    expect(aliases.consent).toBe(publishedVersion.consent);
    expect(aliases.pdfArtifact).toBe(publishedVersion.artifact);
    expect(aliases.version).toBe(publishedVersion.document.version);
    expect(aliases.contentSha256).toBe(publishedVersion.artifact.contentSha256);
  });

  test("keeps version, effective-date, and literal checksum invariants aligned", () => {
    // arrange
    const publication = CURRENT_WEBSITE_AND_STORE_TERMS;

    // act
    const versions = [
      publication.document.version,
      publication.consent.termsVersion,
      publication.artifact.termsVersion,
    ];
    const effectiveDates = [
      publication.document.effectiveDate,
      publication.artifact.effectiveDate,
    ];

    // assert
    expect(versions).toEqual(["1.0", "1.0", "1.0"]);
    expect(effectiveDates).toEqual(["2026-07-26", "2026-07-26"]);
    expect(publication.artifact.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(publication.artifact.pdfSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(legalDocumentSha256(publication.document)).toBe(
      publication.artifact.contentSha256,
    );
  });
});
