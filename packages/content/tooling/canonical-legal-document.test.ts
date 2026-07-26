import { describe, expect, test } from "vitest";

import type { LegalDocument } from "../src/legal-document";
import {
  canonicalizeLegalDocument,
  legalDocumentSha256,
} from "./canonical-legal-document";

const DOCUMENT_FIXTURE = {
  id: "canonical-document",
  version: "1.0",
  effectiveDate: "2026-07-26",
  title: "Cafe\u0301",
  description: "Canonical fixture",
  sections: [
    {
      id: "fixture-section",
      heading: "Fixture section",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Read ",
            { href: "/privacy", label: "Privacy", scope: "internal" },
            " and ",
            {
              href: "https://example.com/terms",
              label: "External",
              scope: "external",
            },
          ],
        },
        { kind: "list", items: [["First item"]] },
        {
          kind: "definition-list",
          items: [{ term: "Term", description: ["Definition"] }],
        },
      ],
    },
  ],
} as const satisfies LegalDocument;

describe("canonical legal documents", () => {
  test("serializes the schema in fixed order with NFC strings", () => {
    // arrange
    const expected =
      '{"id":"canonical-document","version":"1.0","effectiveDate":"2026-07-26","title":"Café","description":"Canonical fixture","sections":[{"id":"fixture-section","heading":"Fixture section","blocks":[{"kind":"paragraph","content":["Read ",{"href":"/privacy","label":"Privacy","scope":"internal"}," and ",{"href":"https://example.com/terms","label":"External","scope":"external"}]},{"kind":"list","items":[["First item"]]},{"kind":"definition-list","items":[{"term":"Term","description":["Definition"]}]}]}]}';

    // act
    const canonical = canonicalizeLegalDocument(DOCUMENT_FIXTURE);

    // assert
    expect(canonical).toBe(expected);
    expect(canonical.startsWith("\uFEFF")).toBe(false);
    expect(canonical.endsWith("\n")).toBe(false);
  });

  test("gives NFC-equivalent documents the same digest and semantic changes a new digest", () => {
    // arrange
    const composed = {
      ...DOCUMENT_FIXTURE,
      title: "Café",
    } satisfies LegalDocument;
    const changed = {
      ...DOCUMENT_FIXTURE,
      description: "Changed fixture",
    } satisfies LegalDocument;

    // act
    const originalDigest = legalDocumentSha256(DOCUMENT_FIXTURE);
    const composedDigest = legalDocumentSha256(composed);
    const changedDigest = legalDocumentSha256(changed);

    // assert
    expect(originalDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(composedDigest).toBe(originalDigest);
    expect(changedDigest).not.toBe(originalDigest);
  });
});
