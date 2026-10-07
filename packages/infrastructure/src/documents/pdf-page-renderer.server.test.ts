import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  FIRST_PAGE,
  loadPdfDocument,
  renderPdfPage,
} from "./pdf-page-renderer.server";

const PAGE_RENDITION = { longEdge: 800, webpQuality: 80 };
const DARK_INK = 128;

type HandWrittenPdf = {
  resources: string;
  content: string;
  extraObjects: readonly string[];
};

function handWrittenPdf(pdf: HandWrittenPdf): Uint8Array {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources ${pdf.resources} /Contents 4 0 R >>`,
    `<< /Length ${Buffer.byteLength(pdf.content)} >>\nstream\n${pdf.content}\nendstream`,
    ...pdf.extraObjects,
  ];
  const header = "%PDF-1.7\n";
  const offsets: number[] = [];
  let body = header;

  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(Buffer.byteLength(body)),
    "%%EOF",
    "",
  ].join("\n");

  return new Uint8Array(Buffer.from(body + xref));
}

function japaneseTextPdf(): Uint8Array {
  return handWrittenPdf({
    resources: "<< /Font << /F1 5 0 R >> >>",
    content: "BT /F1 32 Tf 72 700 Td <65E5672C8A9E> Tj ET",
    extraObjects: [
      "<< /Type /Font /Subtype /Type0 /BaseFont /KozMinPr6N-Regular /Encoding /UniJIS-UCS2-H /DescendantFonts [6 0 R] >>",
      "<< /Type /Font /Subtype /CIDFontType0 /BaseFont /KozMinPr6N-Regular /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 6 >> /FontDescriptor 7 0 R >>",
      "<< /Type /FontDescriptor /FontName /KozMinPr6N-Regular /Flags 4 /FontBBox [0 -120 1000 880] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>",
    ],
  });
}

async function darkestGreyOf(image: Uint8Array): Promise<number> {
  const { channels } = await sharp(image).greyscale().stats();

  return channels[0]?.min ?? 255;
}

describe("renderPdfPage", () => {
  it("draws text whose font is encoded through a predefined CJK CMap", async () => {
    // arrange
    const loading = loadPdfDocument(japaneseTextPdf());
    const pdf = await loading.promise;

    // act
    const page = await renderPdfPage(pdf, FIRST_PAGE, PAGE_RENDITION);
    await loading.destroy();

    // assert
    expect(await darkestGreyOf(page)).toBeLessThan(DARK_INK);
  });
});
