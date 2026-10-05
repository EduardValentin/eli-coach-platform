import type {
  ReadableResourceDocument,
  ResourceDocumentPages,
  ResourceDocumentReading,
  ResourcePageImage,
  ResourceRenditions,
} from "@eli-coach-platform/domain/client-resources";

import type { PageRendition } from "./pdf-pages-messages.server";
import { openPdfPages, type PdfPages } from "./pdf-pages.server";

const WEBP_QUALITY = 80;

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
  readonly #pageRendition: PageRendition;
  readonly #thumbnailRendition: PageRendition;

  constructor({ workerUrl, renditions }: ResourceDocumentPagesOptions) {
    this.#workerUrl = workerUrl;
    this.#pageRendition = {
      longEdge: renditions.page.longEdge,
      webpQuality: WEBP_QUALITY,
    };
    this.#thumbnailRendition = {
      longEdge: renditions.thumbnail.longEdge,
      webpQuality: WEBP_QUALITY,
    };
  }

  async read(bytes: Uint8Array): Promise<ResourceDocumentReading> {
    const opening = await openPdfPages(this.#workerUrl, bytes);

    if (opening.status === "unreadable") {
      return { status: "unreadable" };
    }

    return this.#readable(opening.pages);
  }

  #readable(document: PdfPages): ReadableResourceDocument {
    const pageRendition = this.#pageRendition;
    const thumbnailRendition = this.#thumbnailRendition;
    let closing: Promise<void> | undefined;

    return {
      status: "readable",
      pageCount: document.pageCount,
      async *pages(): AsyncIterable<ResourcePageImage> {
        for (
          let pageNumber = 1;
          pageNumber <= document.pageCount;
          pageNumber++
        ) {
          yield {
            pageNumber,
            bytes: await document.renderPage(pageNumber, pageRendition),
          };
        }
      },
      thumbnail: () => document.renderPage(1, thumbnailRendition),
      close: () => (closing ??= document.close()),
    };
  }
}
