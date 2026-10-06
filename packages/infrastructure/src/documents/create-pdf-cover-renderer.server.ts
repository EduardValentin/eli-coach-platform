import { loadPdfDocument, renderPdfPage } from "./pdf-page-renderer.server";

type PdfCoverRendition = { width: number; webpQuality: number };

type PdfCoverRenderer = {
  render(pdf: Uint8Array, rendition: PdfCoverRendition): Promise<Uint8Array>;
};

const COVER_PAGE = 1;

export function createPdfCoverRenderer(): PdfCoverRenderer {
  return {
    async render(pdf, rendition) {
      const loadingTask = loadPdfDocument(pdf.slice(), rendition.width);

      try {
        const document = await loadingTask.promise;
        return await renderPdfPage(document, COVER_PAGE, rendition);
      } finally {
        await loadingTask.destroy();
      }
    },
  };
}
