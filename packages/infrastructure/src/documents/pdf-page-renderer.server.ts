import { fileURLToPath } from "node:url";

import { createCanvas } from "@napi-rs/canvas";
import {
  getDocument,
  VerbosityLevel,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";

export type PdfLongEdgeRendition = { longEdge: number; webpQuality: number };

export type PdfWidthRendition = { width: number; webpQuality: number };

type PdfPageRendition = PdfLongEdgeRendition | PdfWidthRendition;

export const FIRST_PAGE = 1;

type PageSize = { width: number; height: number };

const MAX_IMAGE_PIXELS = 40_000_000;

export function loadPdfDocument(bytes: Uint8Array): PDFDocumentLoadingTask {
  return getDocument({
    data: bytes,
    standardFontDataUrl: standardFontDirectory(),
    verbosity: VerbosityLevel.ERRORS,
    maxImageSize: MAX_IMAGE_PIXELS,
  });
}

export async function renderPdfPage(
  document: PDFDocumentProxy,
  pageNumber: number,
  rendition: PdfPageRendition,
): Promise<Uint8Array> {
  const page = await document.getPage(pageNumber);
  const viewport = page.getViewport({
    scale: scaleFor(page.getViewport({ scale: 1 }), rendition),
  });
  const canvas = createCanvas(
    Math.round(viewport.width),
    Math.round(viewport.height),
  );
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  try {
    await page.render({
      // pdf.js draws through canvasContext only when canvas is explicitly null.
      canvas: null,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    return new Uint8Array(await canvas.encode("webp", rendition.webpQuality));
  } finally {
    page.cleanup();
  }
}

function scaleFor(naturalSize: PageSize, rendition: PdfPageRendition): number {
  if ("longEdge" in rendition) {
    return rendition.longEdge / Math.max(naturalSize.width, naturalSize.height);
  }

  return rendition.width / naturalSize.width;
}

// pdf.js reads standard fonts in Node through the filesystem, so a file: URL draws no text.
function standardFontDirectory(): string {
  return fileURLToPath(
    new URL(
      "../../standard_fonts/",
      import.meta.resolve("pdfjs-dist/legacy/build/pdf.mjs"),
    ),
  );
}
