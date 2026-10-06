import type {
  ReadableResourceDocument,
  ResourceDocumentPages,
  ResourceDocumentReading,
  ResourcePageImage,
  ResourceRenditions,
} from "@eli-coach-platform/domain/client-resources";

import {
  FIRST_PAGE,
  type PdfLongEdgeRendition,
} from "./pdf-page-renderer.server";
import { openPdfPages, type PdfPages } from "./pdf-pages.server";

type ResourceDocumentPagesOptions = {
  workerUrl: URL;
  renditions: ResourceRenditions;
};

export function createResourceDocumentPages(
  options: ResourceDocumentPagesOptions,
): ResourceDocumentPages {
  return new WorkerResourceDocumentPages(options);
}

class WorkerResourceDocumentPages implements ResourceDocumentPages {
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
    const opening = await openPdfPages(this.#workerUrl, {
      bytes,
      longestEdge: this.#pageRendition.longEdge,
    });

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
