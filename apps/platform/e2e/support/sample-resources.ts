import {
  MAX_RESOURCE_FILE_BYTES,
  MAX_RESOURCE_PAGES,
} from "@eli-coach-platform/domain/client-resources";
import sharp from "sharp";

import {
  excelWorkbook,
  japaneseTextPdf,
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

const PDF_COMMENT_START = Buffer.from("\n%");

const KILOBYTE = 1024;

export function readableSizeOf({ buffer }: SampleResource): string {
  return buffer.byteLength < KILOBYTE
    ? `${buffer.byteLength} B`
    : `${Math.round(buffer.byteLength / KILOBYTE)} KB`;
}

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
  PDF_COMMENT_START.copy(padding);

  return {
    name,
    mimeType: PDF_MIME_TYPE,
    buffer: Buffer.concat([document, padding]),
  };
}

export function japaneseMenuPdf(): SampleResource {
  return {
    name: "japanese-menu.pdf",
    mimeType: PDF_MIME_TYPE,
    buffer: japaneseTextPdf(),
  };
}
