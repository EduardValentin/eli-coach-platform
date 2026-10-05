import PDFDocument from "pdfkit";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

import { openPdfPages, type PdfPages } from "./pdf-pages.server";

const WORKER_URL = new URL("./pdf-pages-worker.server.ts", import.meta.url);
const PAGE_RENDITION = { longEdge: 1600, webpQuality: 80 };
const THUMBNAIL_RENDITION = { longEdge: 480, webpQuality: 80 };

type PageLayout = "portrait" | "landscape";

type PdfOptions = { userPassword?: string };

function pdfOf(
  layouts: PageLayout[],
  options: PdfOptions = {},
): Promise<Uint8Array> {
  const document = new PDFDocument({ autoFirstPage: false, ...options });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));

  for (const [index, layout] of layouts.entries()) {
    document.addPage({ size: "A4", layout });
    document
      .font("Helvetica")
      .fontSize(24)
      .text(`Page ${index + 1}`);
  }

  return new Promise((resolve) => {
    document.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    document.end();
  });
}

async function openedPages(bytes: Uint8Array): Promise<PdfPages> {
  const opening = await openPdfPages(WORKER_URL, bytes);

  if (opening.status !== "opened") {
    throw new Error("Expected the PDF to open.");
  }

  openDocuments.push(opening.pages);
  return opening.pages;
}

const openDocuments: PdfPages[] = [];

afterEach(async () => {
  await Promise.all(openDocuments.splice(0).map((pages) => pages.close()));
});

describe("openPdfPages", () => {
  it("reports the page count of a readable PDF", async () => {
    // arrange
    const bytes = await pdfOf(["portrait", "portrait", "landscape"]);

    // act
    const pages = await openedPages(bytes);

    // assert
    expect(pages.pageCount).toBe(3);
  });

  it("renders a portrait page as a WebP whose height is the long edge", async () => {
    // arrange
    const pages = await openedPages(await pdfOf(["portrait"]));

    // act
    const page = await pages.renderPage(1, PAGE_RENDITION);

    // assert
    const metadata = await sharp(page).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.height).toBe(1600);
    expect(metadata.width).toBe(1131);
  });

  it("renders a landscape page bounded by its width", async () => {
    // arrange
    const pages = await openedPages(await pdfOf(["portrait", "landscape"]));

    // act
    const page = await pages.renderPage(2, PAGE_RENDITION);

    // assert
    const metadata = await sharp(page).metadata();
    expect([metadata.width, metadata.height]).toEqual([1600, 1131]);
  });

  it("renders the first page at thumbnail size", async () => {
    // arrange
    const pages = await openedPages(await pdfOf(["portrait", "portrait"]));

    // act
    const thumbnail = await pages.renderPage(1, THUMBNAIL_RENDITION);

    // assert
    const metadata = await sharp(thumbnail).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.height).toBe(480);
  });

  it("refuses a page outside the document and keeps rendering the others", async () => {
    // arrange
    const pages = await openedPages(await pdfOf(["portrait"]));

    // act
    const outsidePage = pages.renderPage(2, PAGE_RENDITION);

    // assert
    await expect(outsidePage).rejects.toThrow(Error);
    const page = await pages.renderPage(1, THUMBNAIL_RENDITION);
    expect((await sharp(page).metadata()).format).toBe("webp");
  });

  it("leaves the caller's bytes intact", async () => {
    // arrange
    const bytes = await pdfOf(["portrait"]);
    const length = bytes.byteLength;

    // act
    await openedPages(bytes);

    // assert
    expect(bytes.byteLength).toBe(length);
  });

  it("answers unreadable for bytes that are not a PDF", async () => {
    // arrange
    const bytes = new TextEncoder().encode("plain text, not a document");

    // act
    const opening = await openPdfPages(WORKER_URL, bytes);

    // assert
    expect(opening).toEqual({ status: "unreadable" });
  });

  it("answers unreadable for a password-protected PDF", async () => {
    // arrange
    const bytes = await pdfOf(["portrait"], { userPassword: "secret" });

    // act
    const opening = await openPdfPages(WORKER_URL, bytes);

    // assert
    expect(opening).toEqual({ status: "unreadable" });
  });

  it("answers unreadable for a truncated PDF", async () => {
    // arrange
    const bytes = await pdfOf(["portrait", "portrait"]);
    const truncated = bytes.subarray(0, Math.floor(bytes.byteLength / 2));

    // act
    const opening = await openPdfPages(WORKER_URL, truncated);

    // assert
    expect(opening).toEqual({ status: "unreadable" });
  });

  it("rejects when the worker cannot be started", async () => {
    // arrange
    const missingWorker = new URL("./missing-worker.ts", import.meta.url);
    const bytes = await pdfOf(["portrait"]);

    // act
    const opening = openPdfPages(missingWorker, bytes);

    // assert
    await expect(opening).rejects.toThrow(Error);
  });
});
