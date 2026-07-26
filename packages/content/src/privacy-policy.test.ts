import { describe, expect, test } from "vitest";

import {
  EVOA_FITNESS_PRIVACY_EMAIL,
  PRIVACY_POLICY,
  PRIVACY_POLICY_VERSION,
  WAITLIST_MARKETING_CONSENT,
  WAITLIST_MARKETING_CONSENT_VERSION,
  type LegalDocument,
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

function hasOnlyNonEmptyFragments(text: LegalText): boolean {
  return (
    text.length > 0 &&
    text.every((fragment) =>
      typeof fragment === "string"
        ? fragment.trim().length > 0
        : fragment.label.trim().length > 0,
    )
  );
}

describe("privacy policy content", () => {
  test("publishes the approved document identity and ordered section contract", () => {
    // arrange
    const expectedIdentity = {
      id: "privacy-policy",
      version: "1.0",
      effectiveDate: "2026-07-25",
    };

    // act
    const identity = {
      id: PRIVACY_POLICY.id,
      version: PRIVACY_POLICY.version,
      effectiveDate: PRIVACY_POLICY.effectiveDate,
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
            return !hasOnlyNonEmptyFragments(block.content);
          }

          return (
            block.items.length === 0 ||
            block.items.some((item) =>
              "term" in item
                ? item.term.trim().length === 0 ||
                  !hasOnlyNonEmptyFragments(item.description)
                : !hasOnlyNonEmptyFragments(item),
            )
          );
        }),
    );
    const blockKinds = sections.flatMap((section) =>
      section.blocks.map((block) => block.kind),
    );

    // assert
    expect(emptySections).toEqual([]);
    expect(blockKinds).toEqual(
      expect.arrayContaining(["paragraph", "list", "definition-list"]),
    );
  });

  test("uses structured links with the expected targets and scopes", () => {
    // arrange
    const expectedLinks = [
      [`mailto:${EVOA_FITNESS_PRIVACY_EMAIL}`, "external"],
      ["https://eur-lex.europa.eu/eli/reg/2016/679/oj", "external"],
      ["https://www.cloudflare.com/turnstile-privacy-policy/", "external"],
      ["https://www.cloudflare.com/cloudflare-customer-dpa/", "external"],
      ["https://resend.com/legal/dpa", "external"],
      ["https://resend.com/legal/subprocessors", "external"],
      [
        "https://www.dataprotection.ro/index.jsp?lang=en&page=Transmiterea_plangerilor_catre_ANSPDCP",
        "external",
      ],
      ["/privacy", "internal"],
    ];

    // act
    const links = documentLinks(PRIVACY_POLICY);
    const linkTargets = links.map(({ href, scope }) => [href, scope]);

    // assert
    for (const expectedLink of expectedLinks) {
      expect(linkTargets).toContainEqual(expectedLink);
    }
    for (const link of links) {
      expect(link.label.trim()).not.toHaveLength(0);
      if (link.scope === "external") {
        expect(new URL(link.href).protocol).toMatch(/^(https?:|mailto:)$/);
      } else {
        expect(link.href).toMatch(/^\//);
      }
    }
  });

  test("publishes a versioned, structurally complete waitlist consent notice", () => {
    // arrange
    const expectedVersion = "1.1";

    // act
    const noticeParts = [
      WAITLIST_MARKETING_CONSENT.beforePrivacyEmail,
      WAITLIST_MARKETING_CONSENT.betweenPrivacyEmailAndPolicyLink,
      WAITLIST_MARKETING_CONSENT.privacyPolicyLinkLabel,
      WAITLIST_MARKETING_CONSENT.afterPrivacyPolicyLink,
    ];

    // assert
    expect(WAITLIST_MARKETING_CONSENT_VERSION).toBe(expectedVersion);
    expect(noticeParts.every((part) => part.trim().length > 0)).toBe(true);
  });
});
