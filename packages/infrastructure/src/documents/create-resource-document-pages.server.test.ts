import {
  RESOURCE_RENDITIONS,
  type ReadableResourceDocument,
} from "@eli-coach-platform/domain/client-resources";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

import { createResourceDocumentPages } from "./create-resource-document-pages.server";

const documentPages = createResourceDocumentPages({
  workerUrl: new URL("./pdf-pages-worker.server.ts", import.meta.url),
  renditions: RESOURCE_RENDITIONS,
});

const openDocuments: ReadableResourceDocument[] = [];

function pdfOf(pageCount: number, options = {}): Promise<Uint8Array> {
  const document = new PDFDocument({ autoFirstPage: false, ...options });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));

  for (let page = 1; page <= pageCount; page++) {
    document.addPage({ size: "A4" });
    document.font("Helvetica").fontSize(24).text(`Page ${page}`);
  }

  return new Promise((resolve) => {
    document.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    document.end();
  });
}

async function readable(bytes: Uint8Array): Promise<ReadableResourceDocument> {
  const reading = await documentPages.read(bytes);

  if (reading.status !== "readable") {
    throw new Error("Expected the PDF to be readable.");
  }

  openDocuments.push(reading);
  return reading;
}

afterEach(async () => {
  await Promise.all(
    openDocuments.splice(0).map((document) => document.close()),
  );
});

describe("createResourceDocumentPages", () => {
  it("reports the page count of a readable PDF", async () => {
    // arrange
    const bytes = await pdfOf(3);

    // act
    const document = await readable(bytes);

    // assert
    expect(document.pageCount).toBe(3);
  });

  it("yields every page in order as a WebP bounded by the page rendition", async () => {
    // arrange
    const document = await readable(await pdfOf(3));
    const pages = [];

    // act
    for await (const page of document.pages()) {
      pages.push({
        pageNumber: page.pageNumber,
        metadata: await sharp(page.bytes).metadata(),
      });
    }

    // assert
    expect(pages.map((page) => page.pageNumber)).toEqual([1, 2, 3]);
    for (const { metadata } of pages) {
      expect(metadata.format).toBe("webp");
      expect(metadata.height).toBe(RESOURCE_RENDITIONS.page.longEdge);
    }
  });

  it("renders each page only when it is pulled", async () => {
    // arrange
    const document = await readable(await pdfOf(2));
    const pages = document.pages()[Symbol.asyncIterator]();
    const first = await pages.next();

    // act
    await document.close();
    const second = pages.next();

    // assert
    expect(first.value?.pageNumber).toBe(1);
    await expect(second).rejects.toThrow(Error);
  });

  it("renders the thumbnail bounded by the thumbnail rendition", async () => {
    // arrange
    const document = await readable(await pdfOf(2));

    // act
    const thumbnail = await document.thumbnail();

    // assert
    const metadata = await sharp(thumbnail).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.height).toBe(RESOURCE_RENDITIONS.thumbnail.longEdge);
  });

  it("answers unreadable for a password-protected PDF", async () => {
    // arrange
    const bytes = await pdfOf(1, { userPassword: "secret" });

    // act
    const reading = await documentPages.read(bytes);

    // assert
    expect(reading).toEqual({ status: "unreadable" });
  });

  it("closes a document more than once without failing", async () => {
    // arrange
    const document = await readable(await pdfOf(1));

    // act
    const closings = Promise.all([document.close(), document.close()]);

    // assert
    await expect(closings).resolves.toEqual([undefined, undefined]);
    await expect(document.close()).resolves.toBeUndefined();
  });

  it("leaves the caller's bytes intact", async () => {
    // arrange
    const bytes = await pdfOf(1);
    const length = bytes.byteLength;

    // act
    await readable(bytes);

    // assert
    expect(bytes.byteLength).toBe(length);
  });
});
