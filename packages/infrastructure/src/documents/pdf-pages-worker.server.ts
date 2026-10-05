import { fileURLToPath } from "node:url";
import { parentPort } from "node:worker_threads";

import { createCanvas } from "@napi-rs/canvas";
import {
  getDocument,
  VerbosityLevel,
  type PDFDocumentLoadingTask,
} from "pdfjs-dist/legacy/build/pdf.mjs";

import type {
  PageRendition,
  PdfPagesAnswer,
  PdfPagesQuestion,
  PdfPagesRequest,
} from "./pdf-pages-messages.server";

// pdf.js reads standard fonts in Node through the filesystem, so a file: URL fails.
const STANDARD_FONT_DIRECTORY = fileURLToPath(
  new URL(
    "../../standard_fonts/",
    import.meta.resolve("pdfjs-dist/legacy/build/pdf.mjs"),
  ),
);

const port = parentPort;

if (!port) {
  throw new Error("The PDF pages worker runs only as a worker thread.");
}

let loadingTask: PDFDocumentLoadingTask | undefined;

port.on("message", (request: PdfPagesRequest) => {
  void answer(request).then((reply) =>
    port.postMessage({ ...reply, requestId: request.requestId }),
  );
});

async function answer(question: PdfPagesQuestion): Promise<PdfPagesAnswer> {
  if (question.kind === "open") {
    return open(question.bytes);
  }

  try {
    return {
      kind: "rendered",
      bytes: await render(question.pageNumber, question.rendition),
    };
  } catch (error) {
    return { kind: "failed", message: messageOf(error) };
  }
}

async function open(bytes: Uint8Array): Promise<PdfPagesAnswer> {
  try {
    loadingTask = getDocument({
      data: bytes,
      standardFontDataUrl: STANDARD_FONT_DIRECTORY,
      verbosity: VerbosityLevel.ERRORS,
    });
    const document = await loadingTask.promise;
    return { kind: "opened", pageCount: document.numPages };
  } catch {
    return { kind: "unreadable" };
  }
}

async function render(
  pageNumber: number,
  rendition: PageRendition,
): Promise<Uint8Array> {
  if (!loadingTask) {
    throw new Error("No PDF is open in this worker.");
  }

  const document = await loadingTask.promise;
  const page = await document.getPage(pageNumber);
  const naturalSize = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({
    scale: rendition.longEdge / Math.max(naturalSize.width, naturalSize.height),
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

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
