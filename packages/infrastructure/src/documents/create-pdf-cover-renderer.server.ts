import {
  FIRST_PAGE,
  loadPdfDocument,
  renderPdfPage,
  type PdfWidthRendition,
} from "./pdf-page-renderer.server";

type PdfCoverRenderer = {
  render(pdf: Uint8Array, rendition: PdfWidthRendition): Promise<Uint8Array>;
};

export function createPdfCoverRenderer(): PdfCoverRenderer {
  return {
    async render(pdf, rendition) {
      const loadingTask = loadPdfDocument(pdf.slice(), rendition.width);

      try {
        const document = await loadingTask.promise;
        return await renderPdfPage(document, FIRST_PAGE, rendition);
      } finally {
        await loadingTask.destroy();
      }
    },
  };
}
