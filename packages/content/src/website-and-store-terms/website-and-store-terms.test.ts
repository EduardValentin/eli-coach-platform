import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { PDFPageProxy } from "pdfjs-dist";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, test } from "vitest";

import type { LegalDocument, LegalLink, LegalText } from "../legal-document";
import {
  CURRENT_WEBSITE_AND_STORE_TERMS,
  PAID_DIGITAL_DELIVERY_CONSENT,
  WEBSITE_AND_STORE_TERMS_CONTENT_SHA256,
  WEBSITE_AND_STORE_TERMS_PDF_ARTIFACT,
  WEBSITE_AND_STORE_TERMS_VERSION,
  websiteAndStoreTermsPdfArtifactPath,
  websiteAndStoreTermsPdfPackageExportSubpath,
} from "./index";
import {
  canonicalizeLegalDocument,
  legalDocumentSha256,
} from "../legal-document-hash";
import { ensureVersionedTermsPdf } from "../../tooling/ensure-versioned-terms-pdf";
import { renderLegalDocumentPdf } from "../../tooling/render-legal-document-pdf";

const contentPackageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);

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
      "../../../node_modules/pdfjs-dist/standard_fonts/",
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

      const items = textContent.items.filter(isPdfTextItem);

      return items
        .map((item, index) =>
          index > 0 && items[index - 1].hasEOL && items[index - 1].str.endsWith("-")
            ? item.str
            : `${index > 0 ? " " : ""}${item.str}`,
        )
        .join("");
    }),
  );

  return pageText.join(" ").replace(/\s+/g, " ").trim();
}

function visiblePdfText(content: LegalText): string {
  return content
    .map((fragment) => {
      if (typeof fragment === "string") {
        return fragment;
      }

      return fragment.scope === "internal"
        ? `${fragment.label} (${fragment.href})`
        : fragment.label;
    })
    .join("");
}

function formatEffectiveDate(effectiveDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${effectiveDate}T00:00:00Z`));
}

function expectedPdfTextUnits(document: LegalDocument): string[] {
  const sectionUnits = document.sections.flatMap((section) => [
    section.heading,
    ...section.blocks.flatMap((block) => {
      if (block.kind === "paragraph") {
        return [visiblePdfText(block.content)];
      }

      if (block.kind === "list") {
        return block.items.map(visiblePdfText);
      }

      return block.items.flatMap((item) => [
        item.term,
        visiblePdfText(item.description),
      ]);
    }),
  ]);

  return [
    document.title,
    document.description,
    `Version ${document.version}`,
    `Effective date: ${formatEffectiveDate(document.effectiveDate)}`,
    ...sectionUnits,
  ];
}

function expectTextUnitsInOrder(text: string, units: readonly string[]): void {
  let previousIndex = -1;

  for (const unit of units) {
    const unitIndex = text.indexOf(unit, previousIndex + 1);
    expect(unitIndex).toBeGreaterThan(previousIndex);
    previousIndex = unitIndex;
  }
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
  test("derives the current publication from the document version", () => {
    // arrange
    const publication = CURRENT_WEBSITE_AND_STORE_TERMS;
    const version = publication.document.version;

    // act
    const derivedValues = {
      consentVersion: publication.consent.termsVersion,
      consentLabel: publication.consent.termsLinkLabel,
      exportedVersion: WEBSITE_AND_STORE_TERMS_VERSION,
      artifactVersion: publication.artifact.termsVersion,
      artifactDate: publication.artifact.effectiveDate,
      artifactPath: publication.artifact.packageExportSubpath,
    };

    // assert
    expect(derivedValues).toEqual({
      consentVersion: version,
      consentLabel: `Terms & Conditions version ${version}`,
      exportedVersion: version,
      artifactVersion: version,
      artifactDate: publication.document.effectiveDate,
      artifactPath:
        `./artifacts/website-and-store-terms/${version}/terms-and-conditions.pdf`,
    });
  });

  test("calculates the exported checksum from the canonical document", () => {
    // arrange
    const canonicalDocument = canonicalizeLegalDocument(
      CURRENT_WEBSITE_AND_STORE_TERMS.document,
    );

    // act
    const independentDigest = createHash("sha256")
      .update(canonicalDocument)
      .digest("hex");

    // assert
    expect(WEBSITE_AND_STORE_TERMS_CONTENT_SHA256).toBe(independentDigest);
    expect(CURRENT_WEBSITE_AND_STORE_TERMS.artifact.contentSha256).toBe(
      independentDigest,
    );
    expect(
      legalDocumentSha256(CURRENT_WEBSITE_AND_STORE_TERMS.document),
    ).toBe(independentDigest);
  });

  test("builds artifact paths from any safe Terms version", () => {
    // arrange
    const version = "2030.4";

    // act
    const artifactPath = websiteAndStoreTermsPdfArtifactPath(version);
    const packageSubpath =
      websiteAndStoreTermsPdfPackageExportSubpath(version);

    // assert
    expect(artifactPath).toBe(
      "artifacts/website-and-store-terms/2030.4/terms-and-conditions.pdf",
    );
    expect(packageSubpath).toBe(
      "./artifacts/website-and-store-terms/2030.4/terms-and-conditions.pdf",
    );
  });

  test("creates a missing versioned PDF once", async () => {
    // arrange
    const directory = await mkdtemp(join(tmpdir(), "gen-152-terms-"));
    const pdfPath = join(directory, "2.0", "terms-and-conditions.pdf");
    const pdfBytes = await renderLegalDocumentPdf(
      CURRENT_WEBSITE_AND_STORE_TERMS.document,
    );

    // act
    const status = await ensureVersionedTermsPdf({ pdfPath, pdfBytes });

    // assert
    expect(status).toBe("created");
    expect(await readFile(pdfPath)).toEqual(Buffer.from(pdfBytes));
  });

  test("matches an identical PDF without rewriting it", async () => {
    // arrange
    const directory = await mkdtemp(join(tmpdir(), "gen-152-terms-"));
    const pdfPath = join(directory, "2.0", "terms-and-conditions.pdf");
    const pdfBytes = await renderLegalDocumentPdf(
      CURRENT_WEBSITE_AND_STORE_TERMS.document,
    );
    await mkdir(dirname(pdfPath), { recursive: true });
    await writeFile(pdfPath, pdfBytes);
    const fixedTime = new Date("2026-01-01T00:00:00.000Z");
    await utimes(pdfPath, fixedTime, fixedTime);

    // act
    const status = await ensureVersionedTermsPdf({ pdfPath, pdfBytes });

    // assert
    expect(status).toBe("matched");
    expect((await stat(pdfPath)).mtimeMs).toBe(fixedTime.getTime());
  });

  test("refuses to overwrite a differing published version", async () => {
    // arrange
    const directory = await mkdtemp(join(tmpdir(), "gen-152-terms-"));
    const pdfPath = join(directory, "2.0", "terms-and-conditions.pdf");
    const publishedBytes = Buffer.from("published");
    await mkdir(dirname(pdfPath), { recursive: true });
    await writeFile(pdfPath, publishedBytes);

    // act
    const publication = ensureVersionedTermsPdf({
      pdfPath,
      pdfBytes: Buffer.from("changed"),
    });

    // assert
    await expect(publication).rejects.toThrow(
      "Create a new Terms version and effective date",
    );
    expect(await readFile(pdfPath)).toEqual(publishedBytes);
  });

  test("keeps document content and links non-empty", () => {
    // arrange
    const document = CURRENT_WEBSITE_AND_STORE_TERMS.document;

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
    const links = documentLinks(document);

    // assert
    expect(incompleteSections).toEqual([]);
    expect(links).not.toEqual([]);
    expect(links.every((link) => link.label.trim() && link.href.trim())).toBe(
      true,
    );
  });

  test("keeps the committed current PDF deterministic, complete, and substantive", async () => {
    // arrange
    const document = CURRENT_WEBSITE_AND_STORE_TERMS.document;
    const committedPdfPath = join(
      contentPackageRoot,
      websiteAndStoreTermsPdfArtifactPath(document.version),
    );

    // act
    const firstGeneratedPdf = await renderLegalDocumentPdf(document);
    const secondGeneratedPdf = await renderLegalDocumentPdf(document);
    const committedPdf = await readFile(committedPdfPath);
    const parsed = await parsePdf(firstGeneratedPdf);
    const text = await extractPdfText(firstGeneratedPdf);
    const pageTexts = await Promise.all(
      Array.from({ length: parsed.numPages }, async (_, index) => {
        const page = await parsed.getPage(index + 1);
        const textContent = await page.getTextContent();

        return textContent.items
          .filter(isPdfTextItem)
          .map((item) => item.str)
          .join("")
          .trim();
      }),
    );

    // assert
    expect(Buffer.from(secondGeneratedPdf)).toEqual(Buffer.from(firstGeneratedPdf));
    expect(committedPdf).toEqual(Buffer.from(firstGeneratedPdf));
    expect(parsed.numPages).toBeGreaterThan(1);
    expectTextUnitsInOrder(text, expectedPdfTextUnits(document));
    for (const [index, pageText] of pageTexts.entries()) {
      const expectedPageNumber = `Page ${index + 1} of ${parsed.numPages}`;
      const pageNumberMatches = pageText.match(/Page \d+ of \d+/g) ?? [];

      expect(pageNumberMatches).toEqual([expectedPageNumber]);
      expect(pageText.replace(expectedPageNumber, "").trim()).not.toBe("");
    }
  });

  test("retains Terms link annotations in the current PDF", async () => {
    // arrange
    const pdf = await parsePdf(
      await renderLegalDocumentPdf(CURRENT_WEBSITE_AND_STORE_TERMS.document),
    );

    // act
    const annotations = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, index) => {
        const page = await pdf.getPage(index + 1);

        return page.getAnnotations();
      }),
    );
    const targets = annotations.flat().map((annotation) => annotation.url);

    // assert
    expect(targets).toEqual(
      expect.arrayContaining([
        "mailto:support@evoa.com",
        "https://eservicii.anpc.ro/",
        "https://reclamatiisal.anpc.ro/",
      ]),
    );
  });

  test("resolves current and future Terms PDF package exports", () => {
    // arrange
    const currentSpecifier =
      `@eli-coach-platform/content/${WEBSITE_AND_STORE_TERMS_PDF_ARTIFACT.packageExportSubpath.slice(2)}`;
    const futureSpecifier =
      "@eli-coach-platform/content/artifacts/website-and-store-terms/2030.4/terms-and-conditions.pdf";

    // act
    const currentResolution = import.meta.resolve(currentSpecifier);
    const futureResolution = import.meta.resolve(futureSpecifier);

    // assert
    expect(currentResolution).toContain(
      `/website-and-store-terms/${CURRENT_WEBSITE_AND_STORE_TERMS.document.version}/terms-and-conditions.pdf`,
    );
    expect(futureResolution).toContain(
      "/website-and-store-terms/2030.4/terms-and-conditions.pdf",
    );
  });

  test("keeps the public current aliases aligned", () => {
    // arrange
    const publication = CURRENT_WEBSITE_AND_STORE_TERMS;

    // act
    const aliases = {
      consent: PAID_DIGITAL_DELIVERY_CONSENT,
      contentSha256: WEBSITE_AND_STORE_TERMS_CONTENT_SHA256,
      pdfArtifact: WEBSITE_AND_STORE_TERMS_PDF_ARTIFACT,
      version: WEBSITE_AND_STORE_TERMS_VERSION,
    };

    // assert
    expect(aliases.consent).toBe(publication.consent);
    expect(aliases.pdfArtifact).toBe(publication.artifact);
    expect(aliases.version).toBe(publication.document.version);
    expect(aliases.contentSha256).toBe(publication.artifact.contentSha256);
  });
});
