import { createRequire } from "node:module";

import PDFDocument from "pdfkit";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { createPdfCoverRenderer } from "./create-pdf-cover-renderer.server";

const COVER_RENDITION = { width: 600, webpQuality: 90 };
const HELVETICA_AS_PDFJS_DRAWS_IT = createRequire(import.meta.url).resolve(
  "pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf",
);
const TEXT = "Strength, one plan";

type FontChoice = (document: PDFKit.PDFDocument) => PDFKit.PDFDocument;

function pdfWithText(chooseFont: FontChoice): Promise<Uint8Array> {
  const document = new PDFDocument({ size: [300, 100], margin: 0 });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  chooseFont(document)
    .fontSize(32)
    .text(TEXT, 20, 60, { baseline: "alphabetic", lineBreak: false });

  return new Promise((resolve) => {
    document.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    document.end();
  });
}

async function greyPixels(webp: Uint8Array): Promise<Buffer> {
  return sharp(webp).greyscale().raw().toBuffer();
}

async function differingPixelShare(
  first: Uint8Array,
  second: Uint8Array,
): Promise<number> {
  const [firstPixels, secondPixels] = await Promise.all([
    greyPixels(first),
    greyPixels(second),
  ]);
  let differing = 0;

  for (let index = 0; index < firstPixels.length; index++) {
    if (Math.abs(firstPixels[index] - secondPixels[index]) > 64) {
      differing++;
    }
  }

  return differing / firstPixels.length;
}

async function darkPixelShare(webp: Uint8Array): Promise<number> {
  const pixels = await greyPixels(webp);
  return pixels.filter((value) => value < 128).length / pixels.length;
}

describe("createPdfCoverRenderer", () => {
  it("renders the first page as a WebP of the requested width", async () => {
    // arrange
    const pdf = await pdfWithText((document) => document.font("Helvetica"));

    // act
    const cover = await createPdfCoverRenderer().render(pdf, COVER_RENDITION);

    // assert
    const metadata = await sharp(cover).metadata();
    expect(metadata.format).toBe("webp");
    expect([metadata.width, metadata.height]).toEqual([600, 200]);
  });

  it("leaves the caller's bytes intact for another render", async () => {
    // arrange
    const pdf = await pdfWithText((document) => document.font("Helvetica"));
    const renderer = createPdfCoverRenderer();
    await renderer.render(pdf, COVER_RENDITION);

    // act
    const second = await renderer.render(pdf, COVER_RENDITION);

    // assert
    expect((await sharp(second).metadata()).width).toBe(600);
  });

  it("draws text in a font the PDF does not embed with pdf.js's own font data", async () => {
    // arrange
    const unembedded = await pdfWithText((document) =>
      document.font("Helvetica"),
    );
    const embedded = await pdfWithText((document) =>
      document.font(HELVETICA_AS_PDFJS_DRAWS_IT),
    );
    const renderer = createPdfCoverRenderer();

    // act
    const [unembeddedCover, embeddedCover] = await Promise.all([
      renderer.render(unembedded, COVER_RENDITION),
      renderer.render(embedded, COVER_RENDITION),
    ]);

    // assert
    expect(await darkPixelShare(unembeddedCover)).toBeGreaterThan(0.01);
    expect(
      await differingPixelShare(unembeddedCover, embeddedCover),
    ).toBeLessThan(0.001);
  });
});
