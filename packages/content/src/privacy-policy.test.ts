import { describe, expect, expectTypeOf, test } from "vitest";

import {
  EVOA_FITNESS_PRIVACY_EMAIL,
  PRIVACY_POLICY,
  PRIVACY_POLICY_VERSION,
  WAITLIST_MARKETING_CONSENT,
  WAITLIST_MARKETING_CONSENT_ID,
  WAITLIST_MARKETING_CONSENT_VERSION,
  type LegalDocument,
  type LegalDocumentBlock,
  type LegalDocumentSection,
  type LegalLink,
  type LegalText,
} from "./index";

const EXPECTED_SECTION_IDS = [
  "about-this-policy",
  "controller-and-contact",
  "personal-data-and-purposes",
  "waitlist-and-marketing",
  "free-store-resources",
  "anonymous-cart",
  "abuse-prevention",
  "email-delivery",
  "hosting-recipients-and-transfers",
  "retention",
  "your-rights",
  "complaints",
  "policy-changes",
] as const;

const EXPECTED_WAITLIST_NOTICE =
  "By joining the waitlist, you agree that Evoa Fitness may email you about coaching availability, launches and news, digital resources, fitness and nutrition content, and occasional offers. You can withdraw your consent at any time by emailing privacy@evoa.fit. See our Privacy Policy.";

function legalTextToString(text: LegalText): string {
  return text
    .map((fragment) =>
      typeof fragment === "string" ? fragment : fragment.label,
    )
    .join("");
}

function blockText(block: LegalDocumentBlock): string {
  if (block.kind === "paragraph") {
    return legalTextToString(block.content);
  }

  return block.items
    .map((item) =>
      "term" in item
        ? `${item.term} ${legalTextToString(item.description)}`
        : legalTextToString(item),
    )
    .join(" ");
}

function documentText(document: LegalDocument): string {
  return document.sections
    .flatMap((section) => section.blocks.map(blockText))
    .join(" ");
}

function documentLinks(document: LegalDocument): LegalLink[] {
  return document.sections.flatMap((section) =>
    section.blocks.flatMap((block) => {
      const texts =
        block.kind === "paragraph"
          ? [block.content]
          : block.items.map((item) =>
              "term" in item ? item.description : item,
            );

      return texts
        .flat()
        .filter((fragment): fragment is LegalLink => typeof fragment !== "string");
    }),
  );
}

describe("privacy policy content", () => {
  test("publishes the approved document identity and ordered section contract", () => {
    // arrange
    const expectedIdentity = {
      id: "privacy-policy",
      version: "1.0",
      effectiveDate: "2026-07-25",
      title: "Privacy Policy",
    };

    // act
    const identity = {
      id: PRIVACY_POLICY.id,
      version: PRIVACY_POLICY.version,
      effectiveDate: PRIVACY_POLICY.effectiveDate,
      title: PRIVACY_POLICY.title,
    };
    const sectionIds = PRIVACY_POLICY.sections.map((section) => section.id);

    // assert
    expect(identity).toEqual(expectedIdentity);
    expect(PRIVACY_POLICY_VERSION).toBe("1.0");
    expect(PRIVACY_POLICY.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(sectionIds).toEqual(EXPECTED_SECTION_IDS);
    expect(new Set(sectionIds).size).toBe(sectionIds.length);
    expect(sectionIds.every((id) => id.trim().length > 0)).toBe(true);
  });

  test("keeps every section and structured content item non-empty", () => {
    // arrange
    const sections: readonly LegalDocumentSection[] = PRIVACY_POLICY.sections;

    // act
    const emptySections = sections.filter(
      (section) =>
        section.heading.trim().length === 0 ||
        section.blocks.length === 0 ||
        section.blocks.some((block) => {
          if (block.kind === "paragraph") {
            return block.content.length === 0;
          }

          return (
            block.items.length === 0 ||
            block.items.some((item) =>
              "term" in item
                ? item.term.trim().length === 0 || item.description.length === 0
                : item.length === 0,
            )
          );
        }),
    );

    // assert
    expect(emptySections).toEqual([]);
  });

  test("contains the approved controller, provider, and retention facts", () => {
    // arrange
    const requiredFacts = [
      "Evoa Fitness, based in Romania, is the controller",
      "privacy@evoa.fit",
      "ANSPDCP",
      "hosted on Hetzner infrastructure in Germany",
      "Cloudflare",
      "Resend",
      "Waitlist email identifiers are retained for 24 months",
      "Free Store email identifiers are retained for 24 months",
      "Operational logs use a 30-day retention period",
      "Production database backups rotate after 14 days",
    ];

    // act
    const publishedText = documentText(PRIVACY_POLICY);

    // assert
    expect(EVOA_FITNESS_PRIVACY_EMAIL).toBe("privacy@evoa.fit");
    for (const fact of requiredFacts) {
      expect(publishedText).toContain(fact);
    }
  });

  test("uses the approved structured links for legal and provider references", () => {
    // arrange
    const expectedLinks = [
      ["privacy@evoa.fit", "mailto:privacy@evoa.fit", "external"],
      [
        "Article 6(1)(a) GDPR",
        "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
        "external",
      ],
      [
        "Article 6(1)(b) GDPR",
        "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
        "external",
      ],
      [
        "Article 6(1)(f) GDPR",
        "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
        "external",
      ],
      [
        "Cloudflare Turnstile Privacy Addendum",
        "https://www.cloudflare.com/turnstile-privacy-policy/",
        "external",
      ],
      [
        "Cloudflare Data Processing Addendum",
        "https://www.cloudflare.com/cloudflare-customer-dpa/",
        "external",
      ],
      [
        "Resend Data Processing Addendum",
        "https://resend.com/legal/dpa",
        "external",
      ],
      [
        "authorized subprocessors",
        "https://resend.com/legal/subprocessors",
        "external",
      ],
      [
        "complaint guidance",
        "https://www.dataprotection.ro/index.jsp?lang=en&page=Transmiterea_plangerilor_catre_ANSPDCP",
        "external",
      ],
      ["/privacy", "/privacy", "internal"],
    ];

    // act
    const links = documentLinks(PRIVACY_POLICY).map(
      ({ label, href, scope }) => [label, href, scope],
    );

    // assert
    for (const expectedLink of expectedLinks) {
      expect(links).toContainEqual(expectedLink);
    }
  });

  test("publishes the exact versioned waitlist consent notice", () => {
    // arrange
    const expectedIdentity = {
      id: "waitlist-marketing-consent",
      version: "1.0",
    };

    // act
    const notice = [
      WAITLIST_MARKETING_CONSENT.beforePrivacyEmail,
      WAITLIST_MARKETING_CONSENT.privacyEmail,
      WAITLIST_MARKETING_CONSENT.betweenPrivacyEmailAndPolicyLink,
      WAITLIST_MARKETING_CONSENT.privacyPolicyLinkLabel,
      WAITLIST_MARKETING_CONSENT.afterPrivacyPolicyLink,
    ].join("");

    // assert
    expect({
      id: WAITLIST_MARKETING_CONSENT_ID,
      version: WAITLIST_MARKETING_CONSENT_VERSION,
    }).toEqual(expectedIdentity);
    expect(WAITLIST_MARKETING_CONSENT).toMatchObject(expectedIdentity);
    expect(notice).toBe(EXPECTED_WAITLIST_NOTICE);
  });

  test("exposes the framework-independent legal document types", () => {
    // arrange
    type ExpectedLink = {
      kind: "link";
      href: string;
      label: string;
      scope: "external" | "internal";
    };

    // act
    type PublishedLink = LegalLink;

    // assert
    expectTypeOf<PublishedLink>().toEqualTypeOf<ExpectedLink>();
    expectTypeOf<LegalText>().toMatchTypeOf<
      readonly (string | ExpectedLink)[]
    >();
    expectTypeOf<LegalDocumentSection["blocks"]>().toEqualTypeOf<
      readonly LegalDocumentBlock[]
    >();
  });
});
