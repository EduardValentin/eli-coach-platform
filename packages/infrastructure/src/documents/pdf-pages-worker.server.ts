import { parentPort } from "node:worker_threads";

import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

import { loadPdfDocument, renderPdfPage } from "./pdf-page-renderer.server.ts";
import type {
  PageRendition,
  PdfPagesAnswer,
  PdfPagesQuestion,
  PdfPagesRequest,
} from "./pdf-pages-messages.server";

const port = parentPort;

if (!port) {
  throw new Error("The PDF pages worker runs only as a worker thread.");
}

let openDocument: PDFDocumentProxy | undefined;

port.on("message", (request: PdfPagesRequest) => {
  void answer(request).then((reply) =>
    port.postMessage({ ...reply, requestId: request.requestId }),
  );
});

async function answer(question: PdfPagesQuestion): Promise<PdfPagesAnswer> {
  if (question.kind === "open") {
    return open(question.bytes, question.longestEdge);
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

async function open(
  bytes: Uint8Array,
  longestEdge: number,
): Promise<PdfPagesAnswer> {
  try {
    openDocument = await loadPdfDocument(bytes, longestEdge).promise;
    return { kind: "opened", pageCount: openDocument.numPages };
  } catch {
    return { kind: "unreadable" };
  }
}

function render(
  pageNumber: number,
  rendition: PageRendition,
): Promise<Uint8Array> {
  if (!openDocument) {
    throw new Error("No PDF is open in this worker.");
  }

  return renderPdfPage(openDocument, pageNumber, rendition);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
