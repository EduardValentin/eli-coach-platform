import {
  MAX_RESOURCE_FILE_BYTES,
  MAX_RESOURCE_PAGES,
} from "@eli-coach-platform/domain/client-resources";

import {
  oldWordDocument,
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

export async function groceryListDocx(): Promise<SampleResource> {
  return {
    name: "grocery-list.docx",
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
