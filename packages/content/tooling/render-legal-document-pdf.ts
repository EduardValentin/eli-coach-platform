import PDFDocument from "pdfkit";

import type {
  LegalDocument,
  LegalDocumentBlock,
  LegalDocumentSection,
  LegalLink,
  LegalText,
} from "../src/legal-document";

const PAGE_MARGIN = 54;
const BODY_FONT_SIZE = 10;
const SECTION_FONT_SIZE = 14;

function textWidth(pdf: PDFKit.PDFDocument): number {
  return pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;
}

function formattedEffectiveDate(effectiveDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${effectiveDate}T00:00:00.000Z`));
}

function renderDocumentHeader(
  pdf: PDFKit.PDFDocument,
  document: LegalDocument,
): void {
  pdf.font("Helvetica-Bold").fontSize(20).text(document.title);
  pdf.moveDown(0.4);
  pdf.font("Helvetica").fontSize(11).text(document.description);
  pdf.moveDown(0.75);
  pdf.font("Helvetica-Bold").fontSize(BODY_FONT_SIZE).text(`Version ${document.version}`);
  pdf.font("Helvetica").fontSize(BODY_FONT_SIZE).text(
    `Effective date: ${formattedEffectiveDate(document.effectiveDate)}`,
  );
  pdf.moveDown(1.25);
}

function renderSection(pdf: PDFKit.PDFDocument, section: LegalDocumentSection): void {
  pdf.font("Helvetica-Bold").fontSize(SECTION_FONT_SIZE);
  const headingHeight = pdf.heightOfString(section.heading, { width: textWidth(pdf) });
  const nextLineHeight = pdf.font("Helvetica").fontSize(BODY_FONT_SIZE).currentLineHeight();
  ensureRoom(pdf, headingHeight + nextLineHeight * 2);
  pdf.font("Helvetica-Bold").fontSize(SECTION_FONT_SIZE).text(section.heading);
  pdf.moveDown(0.35);

  for (const block of section.blocks) {
    renderBlock(pdf, block);
  }

  pdf.moveDown(0.7);
}

function renderBlock(pdf: PDFKit.PDFDocument, block: LegalDocumentBlock): void {
  switch (block.kind) {
    case "paragraph":
      pdf.font("Helvetica").fontSize(BODY_FONT_SIZE);
      renderLegalText(pdf, block.content);
      pdf.moveDown(0.65);
      return;
    case "list":
      for (const item of block.items) {
        pdf.font("Helvetica").fontSize(BODY_FONT_SIZE).text("• ", {
          continued: true,
          indent: 14,
          link: null,
        });
        renderLegalText(pdf, item);
        pdf.moveDown(0.35);
      }
      pdf.moveDown(0.3);
      return;
    case "definition-list":
      for (const item of block.items) {
        pdf.font("Helvetica-Bold").fontSize(BODY_FONT_SIZE).text(`${item.term}: `, {
          continued: true,
          link: null,
        });
        pdf.font("Helvetica").fontSize(BODY_FONT_SIZE);
        renderLegalText(pdf, item.description);
        pdf.moveDown(0.45);
      }
      pdf.moveDown(0.2);
      return;
  }
}

function renderLegalText(pdf: PDFKit.PDFDocument, text: LegalText): void {
  text.forEach((fragment, index) => {
    const isLink = typeof fragment !== "string";
    const content = isLink ? visibleLinkText(fragment) : fragment;
    const externalTarget = isLink && fragment.scope === "external" ? fragment.href : null;

    pdf.text(content, {
      continued: index < text.length - 1,
      link: externalTarget,
      underline: externalTarget === null ? false : true,
    });
  });
}

function visibleLinkText(link: LegalLink): string {
  return link.scope === "internal" ? `${link.label} (${link.href})` : link.label;
}

function ensureRoom(pdf: PDFKit.PDFDocument, requiredHeight: number): void {
  const pageBottom = pdf.page.height - pdf.page.margins.bottom;

  if (pdf.y + requiredHeight > pageBottom) {
    pdf.addPage();
  }
}

function addPageNumbers(pdf: PDFKit.PDFDocument): void {
  const pages = pdf.bufferedPageRange();

  for (let index = 0; index < pages.count; index += 1) {
    pdf.switchToPage(pages.start + index);
    pdf.font("Helvetica").fontSize(9).text(
      `Page ${index + 1} of ${pages.count}`,
      pdf.page.margins.left,
      pdf.page.height - PAGE_MARGIN + 24,
      {
        align: "center",
        height: PAGE_MARGIN,
        lineBreak: false,
        width: textWidth(pdf),
      },
    );
  }
}

export async function renderLegalDocumentPdf(
  document: LegalDocument,
): Promise<Uint8Array> {
  const metadataDate = new Date(`${document.effectiveDate}T00:00:00.000Z`);
  const pdf = new PDFDocument({
    autoFirstPage: false,
    bufferPages: true,
    compress: false,
    info: {
      Title: document.title,
      Author: "Evoa Fitness",
      Subject: document.description,
      Creator: "Evoa Fitness",
      Producer: "Evoa Fitness",
      CreationDate: metadataDate,
      ModDate: metadataDate,
    },
    margins: {
      top: PAGE_MARGIN,
      right: PAGE_MARGIN,
      bottom: PAGE_MARGIN,
      left: PAGE_MARGIN,
    },
    size: "A4",
  });
  const chunks: Buffer[] = [];
  const output = new Promise<Uint8Array>((resolve, reject) => {
    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdf.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    pdf.on("error", reject);
  });

  pdf.addPage();
  renderDocumentHeader(pdf, document);

  for (const section of document.sections) {
    renderSection(pdf, section);
  }

  addPageNumbers(pdf);
  pdf.end();

  return output;
}
