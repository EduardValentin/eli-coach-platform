import {
  type PdfLongEdgeRendition,
  FIRST_PAGE,
} from "~/shared/documents/pdf-page-renderer.server";
import {
  openPdfPages,
  type PdfPages,
} from "~/shared/documents/pdf-pages.server";
import type {
  ResourceDocumentPagesPort,
  ResourceDocumentReading,
  ReadableResourceDocument,
  ResourcePageImage,
} from "~/bounded-contexts/clients/client-resources/domain/client-resources/index";
import type { ResourceDocumentPagesOptions } from "./resource-document-pages.server";

export class WorkerResourceDocumentPagesAdapter implements ResourceDocumentPagesPort {
  readonly #workerUrl: URL;
  readonly #pageRendition: PdfLongEdgeRendition;
  readonly #thumbnailRendition: PdfLongEdgeRendition;

  constructor({ workerUrl, renditions }: ResourceDocumentPagesOptions) {
    this.#workerUrl = workerUrl;
    this.#pageRendition = {
      longEdge: renditions.page.longEdge,
      webpQuality: renditions.quality,
    };
    this.#thumbnailRendition = {
      longEdge: renditions.thumbnail.longEdge,
      webpQuality: renditions.quality,
    };
  }

  async read(bytes: Uint8Array): Promise<ResourceDocumentReading> {
    const opening = await openPdfPages(this.#workerUrl, bytes);

    if (opening.status === "unreadable") {
      return { status: "unreadable" };
    }

    return this.#readableDocumentOf(opening.pages);
  }

  #readableDocumentOf(pdfPages: PdfPages): ReadableResourceDocument {
    const pageRendition = this.#pageRendition;
    const thumbnailRendition = this.#thumbnailRendition;
    let closing: Promise<void> | undefined;

    return {
      status: "readable",
      pageCount: pdfPages.pageCount,
      async *pages(): AsyncIterable<ResourcePageImage> {
        for (
          let pageNumber = FIRST_PAGE;
          pageNumber <= pdfPages.pageCount;
          pageNumber++
        ) {
          yield {
            pageNumber,
            bytes: await pdfPages.renderPage(pageNumber, pageRendition),
          };
        }
      },
      thumbnail: () => pdfPages.renderPage(FIRST_PAGE, thumbnailRendition),
      close: () => (closing ??= pdfPages.close()),
    };
  }
}
