import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFPageProxy } from "pdfjs-dist";
import { describe, expect, test } from "vitest";

import type { LegalDocument } from "../src/legal-document";
import { WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT } from "../src/website-and-store-terms/versions/1.0";
import { renderLegalDocumentPdf } from "./render-legal-document-pdf";

const COMPACT_LEGAL_DOCUMENT = {
  id: "compact-legal-document",
  version: "1.0",
  effectiveDate: "2026-07-26",
  title: "Compact legal document",
  description: "A compact document for PDF renderer coverage.",
  sections: [
    {
      id: "compact-section",
      heading: "Compact section",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Read ",
            { href: "/privacy", label: "Privacy Policy", scope: "internal" },
            ", visit ",
            {
              href: "https://example.com/external",
              label: "Example service",
              scope: "external",
            },
            ", or email ",
            {
              href: "mailto:legal@example.com",
              label: "legal@example.com",
              scope: "external",
            },
            ".",
          ],
        },
        {
          kind: "list",
          items: [["First list item."], ["Second list item."]],
        },
        {
          kind: "definition-list",
          items: [
            {
              term: "Defined term",
              description: ["Definition text."],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies LegalDocument;

const EXPECTED_HEADINGS = [
  "About these Terms",
  "About Evoa Fitness and contacting us",
  "Website and services covered",
  "Using the website and services",
  "Coaching waitlist",
  "Store products and product information",
  "Requesting free products",
  "Paid products, prices, and payment",
  "Immediate digital delivery and withdrawal",
  "Delivery, protected access, and re-downloads",
  "Personal-use licence and intellectual property",
  "Fitness, health, and nutrition information",
  "Website and service availability",
  "Accounts and authenticated services",
  "Third-party links and services",
  "Product problems, refunds, and mandatory remedies",
  "Responsibility and liability",
  "Privacy",
  "Questions, complaints, governing law, and disputes",
  "Changes, versions, and durable copies",
] as const;

type PdfTextContentItem = Awaited<
  ReturnType<PDFPageProxy["getTextContent"]>
>["items"][number];

function isPdfTextItem(
  item: PdfTextContentItem,
): item is Extract<PdfTextContentItem, { str: string }> {
  return "str" in item;
}

async function parsePdf(bytes: Uint8Array) {
  return getDocument({
    data: bytes.slice(),
    standardFontDataUrl: new URL(
      "../node_modules/pdfjs-dist/standard_fonts/",
      import.meta.url,
    ).toString(),
  }).promise;
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await parsePdf(bytes);
  const pageText = await Promise.all(
    Array.from({ length: pdf.numPages }, async (_, index) => {
      const page = await pdf.getPage(index + 1);
      const textContent = await page.getTextContent();

      return textContent.items
        .filter(isPdfTextItem)
        .map((item) => item.str)
        .join(" ");
    }),
  );

  return pageText.join(" ").replace(/\s+/g, " ").trim();
}

describe("renderLegalDocumentPdf", () => {
  test("renders deterministic multi-page bytes with fixed metadata", async () => {
    // arrange
    const document = WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT;

    // act
    const first = await renderLegalDocumentPdf(document);
    const second = await renderLegalDocumentPdf(document);
    const parsed = await parsePdf(first);
    const metadata = await parsed.getMetadata();

    // assert
    expect(Buffer.from(second)).toEqual(Buffer.from(first));
    expect(parsed.numPages).toBeGreaterThan(1);
    expect(metadata.info).toMatchObject({
      Title: "Terms & Conditions",
      Author: "Evoa Fitness",
      Subject:
        "Terms governing the Evoa Fitness website, waitlist, services, and free or paid digital Store products.",
    });
  });

  test("preserves the approved Terms content in order", async () => {
    // arrange
    const finalVersioningParagraph =
      "Changing the content, publisher details, Store contract, payment or delivery rules, withdrawal wording, remedies, governing law, or dispute information requires review and a new published version.";

    // act
    const text = await extractPdfText(
      await renderLegalDocumentPdf(WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT),
    );

    // assert
    expect(text).toContain("Terms & Conditions");
    expect(text).toContain(
      "Terms governing the Evoa Fitness website, waitlist, services, and free or paid digital Store products.",
    );
    expect(text).toContain("Version 1.0");
    expect(text).toContain("Effective date: 26 July 2026");
    expect(text).toContain("support@evoa.com");
    expect(text).toContain(finalVersioningParagraph);
    expect(EXPECTED_HEADINGS).toHaveLength(20);
    let previousHeadingIndex = -1;
    for (const heading of EXPECTED_HEADINGS) {
      const headingIndex = text.indexOf(heading, previousHeadingIndex + 1);

      expect(headingIndex).toBeGreaterThan(previousHeadingIndex);
      previousHeadingIndex = headingIndex;
    }
    expect(text.indexOf(finalVersioningParagraph)).toBeGreaterThan(
      text.indexOf("Changes, versions, and durable copies"),
    );
  });

  test("flows paragraphs, lists, and definition lists into extracted text", async () => {
    // arrange
    const expectedText = [
      "Compact legal document",
      "Compact section",
      "Read Privacy Policy (/privacy), visit Example service, or email legal@example.com.",
      "First list item.",
      "Second list item.",
      "Defined term",
      "Definition text.",
    ];

    // act
    const text = await extractPdfText(
      await renderLegalDocumentPdf(COMPACT_LEGAL_DOCUMENT),
    );

    // assert
    for (const expected of expectedText) {
      expect(text).toContain(expected);
    }
  });

  test("writes non-empty text to every rendered page", async () => {
    // arrange
    const pdf = await parsePdf(
      await renderLegalDocumentPdf(WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT),
    );

    // act
    const pageTexts = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, index) => {
        const page = await pdf.getPage(index + 1);
        const textContent = await page.getTextContent();

        return textContent.items
          .filter(isPdfTextItem)
          .map((item) => item.str)
          .join("")
          .trim();
      }),
    );

    // assert
    expect(pageTexts.every((text) => text.length > 0)).toBe(true);
  });

  test("keeps each numbered page substantive and numbered in parsed-page order", async () => {
    // arrange
    const pdf = await parsePdf(
      await renderLegalDocumentPdf(WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT),
    );

    // act
    const pageTexts = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, index) => {
        const page = await pdf.getPage(index + 1);
        const textContent = await page.getTextContent();

        return textContent.items
          .filter(isPdfTextItem)
          .map((item) => item.str)
          .join("")
          .trim();
      }),
    );

    // assert
    for (const [index, pageText] of pageTexts.entries()) {
      const expectedPageNumber = `Page ${index + 1} of ${pdf.numPages}`;
      const pageNumberMatches = pageText.match(/Page \d+ of \d+/g) ?? [];

      expect(pageNumberMatches).toEqual([expectedPageNumber]);
      expect(pageText.replace(expectedPageNumber, "").trim()).not.toBe("");
    }
  });

  test("retains external and mailto annotation targets", async () => {
    // arrange
    const pdf = await parsePdf(
      await renderLegalDocumentPdf(COMPACT_LEGAL_DOCUMENT),
    );
    const page = await pdf.getPage(1);

    // act
    const annotations = await page.getAnnotations();
    const targets = annotations.map((annotation) => annotation.url);

    // assert
    expect(targets).toEqual(
      expect.arrayContaining([
        "https://example.com/external",
        "mailto:legal@example.com",
      ]),
    );
  });

  test("displays internal links as relative paths without an invented origin", async () => {
    // arrange
    const document = COMPACT_LEGAL_DOCUMENT;

    // act
    const text = await extractPdfText(await renderLegalDocumentPdf(document));

    // assert
    expect(text).toContain("Privacy Policy (/privacy)");
    expect(text).not.toContain("https://evoa.com/privacy");
  });
});
