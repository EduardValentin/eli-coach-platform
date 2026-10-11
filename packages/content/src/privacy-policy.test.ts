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
  "accounts-and-authentication",
  "waitlist-and-marketing",
  "coaching-platform",
  "measurements-photos-and-shared-files",
  "cycle-and-health-data",
  "store-purchases-and-payments",
  "free-store-resources",
  "anonymous-cart",
  "abuse-prevention",
  "email-delivery",
  "hosting-recipients-and-transfers",
  "retention",
  "security",
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
        .filter(
          (fragment): fragment is LegalLink => typeof fragment !== "string",
        );
    }),
  );
}

function readableText(text: LegalText): string {
  return text
    .map((fragment) =>
      typeof fragment === "string" ? fragment : fragment.label,
    )
    .join("");
}

function sectionText(sectionId: string): string {
  const sections: readonly LegalDocumentSection[] = PRIVACY_POLICY.sections;

  return sections
    .filter((section) => section.id === sectionId)
    .flatMap((section) => section.blocks)
    .flatMap((block) => {
      if (block.kind === "paragraph") {
        return [readableText(block.content)];
      }

      return block.items.map((item) =>
        "term" in item
          ? `${item.term}: ${readableText(item.description)}`
          : readableText(item),
      );
    })
    .join(" ");
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
      version: "2.2",
      effectiveDate: "2026-10-11",
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
    expect(PRIVACY_POLICY_VERSION).toBe("2.2");
    expect(PRIVACY_POLICY.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(sectionIds).toEqual(EXPECTED_SECTION_IDS);
    expect(new Set(sectionIds).size).toBe(sectionIds.length);
    expect(sectionIds.every((id) => id.trim().length > 0)).toBe(true);
  });

  test("names the card details kept to show which card is on file, both among the data and where payments are described", () => {
    // arrange
    const sections: readonly LegalDocumentSection[] = PRIVACY_POLICY.sections;
    const cardOnFile =
      "To show you which card is on file, we keep the card brand, its last four digits and expiry date as Stripe reports them; the full card number never reaches us.";

    // act
    const storePurchases = sections
      .flatMap((section) => section.blocks)
      .flatMap((block) => (block.kind === "definition-list" ? block.items : []))
      .find((item) => item.term === "Store purchases");
    const paymentsText = sections
      .filter((section) => section.id === "store-purchases-and-payments")
      .flatMap((section) => section.blocks)
      .flatMap((block) => (block.kind === "paragraph" ? block.content : []))
      .filter((fragment) => typeof fragment === "string")
      .join(" ");

    // assert
    expect(storePurchases?.description.join(" ")).toContain(cardOnFile);
    expect(storePurchases?.description.join(" ")).not.toContain("never stored");
    expect(paymentsText).toContain(cardOnFile);
  });

  test("states its own version and effective date in its opening paragraph", () => {
    // arrange
    const sections: readonly LegalDocumentSection[] = PRIVACY_POLICY.sections;

    // act
    const opening = sections[0]?.blocks[0];
    const text = opening?.kind === "paragraph" ? opening.content.join("") : "";

    // assert
    expect(text).toContain(
      "It is Privacy Policy version 2.2, effective 11 October 2026.",
    );
  });

  test("names body measurements, progress photos and coach-shared files among the data it stores", () => {
    // arrange
    const measurementsAndPhotos =
      "Body measurements and progress photos: For clients: height, weight, and waist, hip, thigh and arm measurements, each with the date you recorded it. Only with your explicit consent: progress photos (front, side and back views) that you attach to a measurement entry.";
    const sharedFiles =
      "Files shared by your coach: For clients: each file your coach adds to your record (a PDF, an image, or a Word or Excel document), with its title, description, tags, file name, type, size, the date it was added, and when you first opened it.";

    // act
    const storedData = sectionText("personal-data-and-purposes");

    // assert
    expect(storedData).toContain(measurementsAndPhotos);
    expect(storedData).toContain(sharedFiles);
  });

  test("says why measurements, photos and shared files are kept, that only the client and her coach see them, and how photo consent is given and withdrawn", () => {
    // arrange
    const expectedStatements = [
      "Your body measurements are processed to follow your progress and adapt your coaching, as part of the coaching service you purchased under Article 6(1)(b) GDPR. They are visible only to you and your coach.",
      "Progress photos are optional. Evoa Fitness stores them only with your explicit consent under Article 6(1)(a) GDPR, which you give in the app before you add your first photo, and uses them only so that you and your coach can follow your progress. They are visible only to you and your coach and are never used for marketing. You receive the same level of coaching without them.",
      `You can remove any progress photo yourself in the app at any time; it is deleted for you and your coach at once. You can also withdraw your consent by emailing ${EVOA_FITNESS_PRIVACY_EMAIL}. Withdrawal deletes your progress photos and does not affect processing that was lawful before withdrawal.`,
      "Your coach can share files with you, such as guides or plans prepared for you. They are stored so that you can read and download them in the app, as part of the coaching service under Article 6(1)(b) GDPR. Each file is visible only to you and your coach. When you first open a file, the platform records it so the file is no longer marked as new.",
    ];

    // act
    const section = sectionText("measurements-photos-and-shared-files");
    const protection = sectionText("security");

    // assert
    for (const statement of expectedStatements) {
      expect(section).toContain(statement);
    }
    expect(protection).toContain(
      "Coaching, cycle, and health data, including your measurements, progress photos, and shared files, is accessible only to you and your coach. Progress photos are encrypted where they are stored.",
    );
  });

  test("keeps measurements, photos and shared files with the host of the application and database, adding no provider", () => {
    // arrange
    const sameHost =
      "Measurements, progress photos, and shared files are stored on the same Hetzner infrastructure in Germany that hosts the application and database. No additional provider stores or processes them.";
    const hetzner =
      "Hetzner: The application, the PostgreSQL database, and the files stored on the platform (progress photos and files shared by your coach) are hosted on Hetzner infrastructure in Germany.";

    // act
    const section = sectionText("measurements-photos-and-shared-files");
    const hosting = sectionText("hosting-recipients-and-transfers");

    // assert
    expect(section).toContain(sameHost);
    expect(hosting).toContain(hetzner);
  });

  test("says how long measurements, photos and shared files are kept and how each goes", () => {
    // arrange
    const expectedRules = [
      "Body measurements are kept with your coaching data and removed with it: within 24 months after the coaching relationship ends, or earlier when your account data is erased.",
      "A progress photo is deleted when you remove it in the app, when you withdraw your consent, or when your account data is erased, and at the latest with the rest of your coaching data.",
      "A file shared by your coach is deleted when your coach removes it or when your account data is erased, and at the latest with the rest of your coaching data. After your coaching ends you can no longer open shared files in the app, and they stay on your coach's record of you until they are deleted.",
    ];

    // act
    const retention = sectionText("retention");

    // assert
    for (const rule of expectedRules) {
      expect(retention).toContain(rule);
    }
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
      ["https://clerk.com/legal/privacy", "external"],
      ["https://clerk.com/legal/dpa", "external"],
      ["https://stripe.com/privacy", "external"],
      ["https://stripe.com/legal/dpa", "external"],
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
