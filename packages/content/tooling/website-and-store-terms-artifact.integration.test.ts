import { fileURLToPath } from "node:url";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFPageProxy } from "pdfjs-dist";
import { afterEach, describe, expect, test } from "vitest";

import { WEBSITE_AND_STORE_TERMS_PDF_ARTIFACT } from "../src/website-and-store-terms";
import { WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT } from "../src/website-and-store-terms/versions/1.0";
import { renderLegalDocumentPdf } from "./render-legal-document-pdf";
import { publishVersionedTermsArtifact } from "./website-and-store-terms-artifact";
import { sha256Hex } from "./canonical-legal-document";

const temporaryDirectories: string[] = [];
const committedPdfPath = fileURLToPath(
  new URL(
    "../artifacts/website-and-store-terms/1.0/terms-and-conditions.pdf",
    import.meta.url,
  ),
);

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

async function createTemporaryArtifactPaths() {
  const directory = await mkdtemp(join(tmpdir(), "website-and-store-terms-"));
  temporaryDirectories.push(directory);

  return {
    pdfPath: join(directory, "artifacts/website-and-store-terms/1.0/terms-and-conditions.pdf"),
    manifestPath: join(
      directory,
      "src/website-and-store-terms/versions/1.0.manifest.ts",
    ),
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("publishVersionedTermsArtifact", () => {
  test("creates a missing versioned PDF and literal manifest exactly once", async () => {
    // arrange
    const paths = await createTemporaryArtifactPaths();
    const pdfBytes = new Uint8Array([37, 80, 68, 70]);

    // act
    const result = await publishVersionedTermsArtifact({
      document: WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT,
      pdfBytes,
      paths,
    });

    // assert
    expect(result.status).toBe("created");
    expect(await readFile(paths.pdfPath)).toEqual(Buffer.from(pdfBytes));
    expect(await readFile(paths.manifestPath, "utf8")).toContain(
      'termsVersion: "1.0"',
    );
    expect(await readFile(paths.manifestPath, "utf8")).toMatch(
      /contentSha256: "[a-f0-9]{64}"/,
    );
    expect(await readFile(paths.manifestPath, "utf8")).toMatch(
      /pdfSha256: "[a-f0-9]{64}"/,
    );
  });

  test("verifies identical existing versioned bytes and manifest", async () => {
    // arrange
    const paths = await createTemporaryArtifactPaths();
    const pdfBytes = new Uint8Array([37, 80, 68, 70]);
    await publishVersionedTermsArtifact({
      document: WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT,
      pdfBytes,
      paths,
    });

    // act
    const result = await publishVersionedTermsArtifact({
      document: WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT,
      pdfBytes,
      paths,
    });

    // assert
    expect(result.status).toBe("verified");
  });

  test("rejects a differing existing PDF without changing either published target", async () => {
    // arrange
    const paths = await createTemporaryArtifactPaths();
    const publishedPdf = new Uint8Array([37, 80, 68, 70]);
    await publishVersionedTermsArtifact({
      document: WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT,
      pdfBytes: publishedPdf,
      paths,
    });
    const manifestBefore = await readFile(paths.manifestPath);
    await writeFile(paths.pdfPath, new Uint8Array([37, 80, 68, 71]));
    const pdfBefore = await readFile(paths.pdfPath);

    // act
    const publication = publishVersionedTermsArtifact({
      document: WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT,
      pdfBytes: publishedPdf,
      paths,
    });

    // assert
    await expect(publication).rejects.toThrow("Published Terms artifact differs");
    expect(await readFile(paths.pdfPath)).toEqual(pdfBefore);
    expect(await readFile(paths.manifestPath)).toEqual(manifestBefore);
  });

  test("rejects a differing existing manifest without changing either published target", async () => {
    // arrange
    const paths = await createTemporaryArtifactPaths();
    const pdfBytes = new Uint8Array([37, 80, 68, 70]);
    await publishVersionedTermsArtifact({
      document: WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT,
      pdfBytes,
      paths,
    });
    const pdfBefore = await readFile(paths.pdfPath);
    await writeFile(paths.manifestPath, "export const altered = true;\n");
    const manifestBefore = await readFile(paths.manifestPath);

    // act
    const publication = publishVersionedTermsArtifact({
      document: WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT,
      pdfBytes,
      paths,
    });

    // assert
    await expect(publication).rejects.toThrow("Published Terms manifest differs");
    expect(await readFile(paths.pdfPath)).toEqual(pdfBefore);
    expect(await readFile(paths.manifestPath)).toEqual(manifestBefore);
  });

  test("rejects a partial publication without creating the missing target", async () => {
    // arrange
    const paths = await createTemporaryArtifactPaths();
    const pdfBytes = new Uint8Array([37, 80, 68, 70]);
    await rm(dirname(paths.pdfPath), { force: true, recursive: true });
    await mkdir(dirname(paths.manifestPath), { recursive: true });
    await writeFile(paths.manifestPath, "export const manifest = true;\n");

    // act
    const publication = publishVersionedTermsArtifact({
      document: WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT,
      pdfBytes,
      paths,
    });

    // assert
    await expect(publication).rejects.toThrow("partially published");
    await expect(readFile(paths.pdfPath)).rejects.toThrow();
    expect(await readFile(paths.manifestPath, "utf8")).toBe(
      "export const manifest = true;\n",
    );
  });

  test("commits the deterministic versioned PDF with its published checksum", async () => {
    // arrange
    const committedBytes = new Uint8Array(await readFile(committedPdfPath));

    // act
    const generatedBytes = await renderLegalDocumentPdf(
      WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT,
    );
    const committedHash = sha256Hex(committedBytes);

    // assert
    expect(Buffer.from(committedBytes)).toEqual(Buffer.from(generatedBytes));
    expect(committedHash).toBe(WEBSITE_AND_STORE_TERMS_PDF_ARTIFACT.pdfSha256);
  });

  test("preserves readable approved Terms content and external annotations in the committed PDF", async () => {
    // arrange
    const committedBytes = new Uint8Array(await readFile(committedPdfPath));
    const finalParagraph =
      "Changing the content, publisher details, Store contract, payment or delivery rules, withdrawal wording, remedies, governing law, or dispute information requires review and a new published version.";

    // act
    const pdf = await parsePdf(committedBytes);
    const text = await extractPdfText(committedBytes);
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
    const annotations = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, index) => {
        const page = await pdf.getPage(index + 1);

        return page.getAnnotations();
      }),
    );
    const annotationTargets = annotations
      .flat()
      .map((annotation) => annotation.url)
      .filter((target): target is string => typeof target === "string");

    // assert
    expect(text).toContain("Terms & Conditions");
    expect(text).toContain(
      "Terms governing the Evoa Fitness website, waitlist, services, and free or paid digital Store products.",
    );
    expect(text).toContain("Version 1.0");
    expect(text).toContain("Effective date: 26 July 2026");
    expect(text).toContain("support@evoa.com");
    expect(text).toContain(finalParagraph);
    expect(text).toContain("Privacy Policy (/privacy)");
    let previousHeadingIndex = -1;
    for (const heading of EXPECTED_HEADINGS) {
      const headingIndex = text.indexOf(heading, previousHeadingIndex + 1);

      expect(headingIndex).toBeGreaterThan(previousHeadingIndex);
      previousHeadingIndex = headingIndex;
    }
    expect(pageTexts.every((pageText) => pageText.length > 0)).toBe(true);
    expect(annotationTargets).toEqual(
      expect.arrayContaining([
        "mailto:support@evoa.com",
        "https://eservicii.anpc.ro/",
        "https://reclamatiisal.anpc.ro/",
      ]),
    );
  });
});
