import { describe, expect, test } from "vitest";

import type { LegalDocument } from "../src/legal-document";
import {
  canonicalizeLegalDocument,
  legalDocumentSha256,
  sha256Hex,
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
      heading: "Fixture cafe\u0301 section",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Read cafe\u0301 ",
            { href: "/priva\u0301cy", label: "Priva\u0301cy", scope: "internal" },
            " and ",
            {
              href: "https://example.com/cafe\u0301",
              label: "Exte\u0301rnal",
              scope: "external",
            },
          ],
        },
        { kind: "list", items: [["First cafe\u0301 item"]] },
        {
          kind: "definition-list",
          items: [{ term: "Te\u0301rm", description: ["Definitio\u0301n"] }],
        },
      ],
    },
  ],
} as const satisfies LegalDocument;

describe("canonical legal documents", () => {
  test("serializes the schema in fixed order with NFC strings", () => {
    // arrange
    const expected =
      '{"id":"canonical-document","version":"1.0","effectiveDate":"2026-07-26","title":"Café","description":"Canonical fixture","sections":[{"id":"fixture-section","heading":"Fixture café section","blocks":[{"kind":"paragraph","content":["Read café ",{"href":"/privácy","label":"Privácy","scope":"internal"}," and ",{"href":"https://example.com/café","label":"Extérnal","scope":"external"}]},{"kind":"list","items":[["First café item"]]},{"kind":"definition-list","items":[{"term":"Térm","description":["Definitión"]}]}]}]}';

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

  test("hashes byte input with the SHA-256 known vector", () => {
    // arrange
    const bytes = new TextEncoder().encode("abc");

    // act
    const digest = sha256Hex(bytes);

    // assert
    expect(digest).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
