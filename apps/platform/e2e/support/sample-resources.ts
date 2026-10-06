import {
  MAX_RESOURCE_FILE_BYTES,
  MAX_RESOURCE_PAGES,
} from "@eli-coach-platform/domain/client-resources";
import sharp from "sharp";

import {
  excelWorkbook,
  oldWordDocument,
  openDocumentSpreadsheet,
  openDocumentText,
  passwordProtectedPdf,
  pdfWithPages,
  plainText,
  wordDocument,
} from "../../integration-test-config/sample-documents";
import { samplePhotoOf } from "./sample-photos";

export type SampleResource = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

const PDF_MIME_TYPE = "application/pdf";

export async function mealPlanPdf(): Promise<SampleResource> {
  return {
    name: "meal-plan-week-1.pdf",
    mimeType: PDF_MIME_TYPE,
    buffer: await pdfWithPages(3),
  };
}

export async function mealPlanPdfNamedHtml(): Promise<SampleResource> {
  return {
    name: "meal-plan.html",
    mimeType: "text/html",
    buffer: await pdfWithPages(1),
  };
}

export async function trainingBlockPdf(): Promise<SampleResource> {
  return {
    name: "training_block.pdf",
    mimeType: PDF_MIME_TYPE,
    buffer: await pdfWithPages(2),
  };
}

export async function overlongPdf(): Promise<SampleResource> {
  return {
    name: "full-season.pdf",
    mimeType: PDF_MIME_TYPE,
    buffer: await pdfWithPages(MAX_RESOURCE_PAGES + 1),
  };
}

export async function lockedPdf(): Promise<SampleResource> {
  return {
    name: "locked-plan.pdf",
    mimeType: PDF_MIME_TYPE,
    buffer: await passwordProtectedPdf(),
  };
}

export function renamedTextFile(): SampleResource {
  return {
    name: "shopping-notes.pdf",
    mimeType: PDF_MIME_TYPE,
    buffer: plainText(),
  };
}

export function oversizedPdf(): SampleResource {
  return {
    name: "scanned-binder.pdf",
    mimeType: PDF_MIME_TYPE,
    buffer: Buffer.alloc(MAX_RESOURCE_FILE_BYTES + 1),
  };
}

export function postureGuideImage(): SampleResource {
  return { ...samplePhotoOf("front"), name: "posture-guide.png" };
}

export async function groceryListDocxNamedDoc(): Promise<SampleResource> {
  return {
    name: "grocery-list.doc",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: await wordDocument(),
  };
}

export function recipesDoc(): SampleResource {
  return {
    name: "recipes.doc",
    mimeType: "application/msword",
    buffer: oldWordDocument(),
  };
}

export async function weeklyTrackerXlsx(): Promise<SampleResource> {
  return {
    name: "weekly-tracker.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await excelWorkbook(),
  };
}

export async function habitNotesOdt(): Promise<SampleResource> {
  return {
    name: "habit-notes.odt",
    mimeType: "application/vnd.oasis.opendocument.text",
    buffer: await openDocumentText(),
  };
}

export async function macroSheetOds(): Promise<SampleResource> {
  return {
    name: "macro-sheet.ods",
    mimeType: "application/vnd.oasis.opendocument.spreadsheet",
    buffer: await openDocumentSpreadsheet(),
  };
}

export async function stretchingPhotoWebp(): Promise<SampleResource> {
  return {
    name: "stretching-routine.webp",
    mimeType: "image/webp",
    buffer: await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 40, g: 140, b: 130 },
      },
    })
      .webp()
      .toBuffer(),
  };
}

export async function pdfOfExactLength(
  name: string,
  byteLength: number,
): Promise<SampleResource> {
  const document = await pdfWithPages(1);
  const padding = Buffer.alloc(byteLength - document.byteLength, 0x20);
  padding[0] = 0x0a;
  padding[1] = 0x25;

  return {
    name,
    mimeType: PDF_MIME_TYPE,
    buffer: Buffer.concat([document, padding]),
  };
}

export function japaneseTextPdf(): SampleResource {
  return {
    name: "japanese-menu.pdf",
    mimeType: PDF_MIME_TYPE,
    buffer: handWrittenPdf({
      mediaBox: "[0 0 595 842]",
      resources: "<< /Font << /F1 5 0 R >> >>",
      content: "BT /F1 32 Tf 72 700 Td <65E5672C8A9E> Tj ET",
      extraObjects: [
        Buffer.from(
          "<< /Type /Font /Subtype /Type0 /BaseFont /KozMinPr6N-Regular /Encoding /UniJIS-UCS2-H /DescendantFonts [6 0 R] >>",
        ),
        Buffer.from(
          "<< /Type /Font /Subtype /CIDFontType0 /BaseFont /KozMinPr6N-Regular /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 6 >> /FontDescriptor 7 0 R >>",
        ),
        Buffer.from(
          "<< /Type /FontDescriptor /FontName /KozMinPr6N-Regular /Flags 4 /FontBBox [0 -120 1000 880] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>",
        ),
      ],
    }),
  };
}

type HandWrittenPdf = {
  mediaBox: string;
  resources: string;
  content: string;
  extraObjects: readonly Buffer[];
};

function handWrittenPdf(pdf: HandWrittenPdf): Buffer {
  const objects: Buffer[] = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox ${pdf.mediaBox} /Resources ${pdf.resources} /Contents 4 0 R >>`,
    ),
    Buffer.from(
      `<< /Length ${Buffer.byteLength(pdf.content)} >>\nstream\n${pdf.content}\nendstream`,
    ),
    ...pdf.extraObjects,
  ];
  const chunks: Buffer[] = [Buffer.from("%PDF-1.7\n")];
  const offsets: number[] = [];
  let length = chunks[0]!.byteLength;

  for (const [index, object] of objects.entries()) {
    offsets.push(length);
    const chunk = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`),
      object,
      Buffer.from("\nendobj\n"),
    ]);
    chunks.push(chunk);
    length += chunk.byteLength;
  }

  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(length),
    "%%EOF",
    "",
  ].join("\n");

  return Buffer.concat([...chunks, Buffer.from(xref)]);
}
