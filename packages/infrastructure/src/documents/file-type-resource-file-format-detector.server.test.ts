import {
  excelWorkbook,
  macroProjectWordDocument,
  oldExcelWorkbook,
  oldPowerPointPresentation,
  oldWordDocument,
  openDocumentSpreadsheet,
  openDocumentText,
  pdfWithPages,
  plainText,
  powerPointPresentation,
  windowsInstaller,
  windowsProgram,
  wordDocument,
} from "@eli-coach-platform/test-support/sample-documents";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { createResourceFileFormatDetector } from "./file-type-resource-file-format-detector.server";

function onePixelImage(): sharp.Sharp {
  return sharp({
    create: {
      width: 1,
      height: 1,
      channels: 3,
      background: { r: 200, g: 120, b: 90 },
    },
  });
}

describe("createResourceFileFormatDetector", () => {
  it.each([
    {
      file: "a PDF",
      bytes: () => pdfWithPages(1),
      type: "pdf",
    },
    {
      file: "a JPEG",
      bytes: () => onePixelImage().jpeg().toBuffer(),
      type: "jpg",
    },
    {
      file: "a PNG",
      bytes: () => onePixelImage().png().toBuffer(),
      type: "png",
    },
    {
      file: "a WebP",
      bytes: () => onePixelImage().webp().toBuffer(),
      type: "webp",
    },
    { file: "a legacy Word file", bytes: oldWordDocument, type: "doc" },
    { file: "a legacy Excel file", bytes: oldExcelWorkbook, type: "xls" },
    {
      file: "a legacy PowerPoint file",
      bytes: oldPowerPointPresentation,
      type: "ppt",
    },
    { file: "a Windows installer", bytes: windowsInstaller, type: "msi" },
    { file: "a Windows program", bytes: windowsProgram, type: "exe" },
  ])(
    "reports $file as $type with no archive entries",
    async ({ bytes, type }) => {
      // arrange
      const detector = createResourceFileFormatDetector();
      const file = await bytes();

      // act
      const detected = await detector.detect(file);

      // assert
      expect(detected).toEqual({ type, archiveEntries: [] });
    },
  );

  it.each([
    {
      file: "a Word file",
      bytes: wordDocument,
      type: "docx",
      archiveEntries: ["[Content_Types].xml", "word/document.xml"],
    },
    {
      file: "a Word file carrying a macro project",
      bytes: macroProjectWordDocument,
      type: "docx",
      archiveEntries: [
        "[Content_Types].xml",
        "word/document.xml",
        "word/vbaProject.bin",
      ],
    },
    {
      file: "an Excel file",
      bytes: excelWorkbook,
      type: "xlsx",
      archiveEntries: ["[Content_Types].xml", "xl/workbook.xml"],
    },
    {
      file: "a PowerPoint file",
      bytes: powerPointPresentation,
      type: "pptx",
      archiveEntries: ["[Content_Types].xml", "ppt/presentation.xml"],
    },
    {
      file: "an OpenDocument text",
      bytes: openDocumentText,
      type: "odt",
      archiveEntries: ["mimetype", "content.xml"],
    },
    {
      file: "an OpenDocument spreadsheet",
      bytes: openDocumentSpreadsheet,
      type: "ods",
      archiveEntries: ["mimetype", "content.xml"],
    },
  ])(
    "reports $file as $type with the names of its archive entries",
    async ({ bytes, type, archiveEntries }) => {
      // arrange
      const detector = createResourceFileFormatDetector();
      const file = await bytes();

      // act
      const detected = await detector.detect(file);

      // assert
      expect(detected).toEqual({ type, archiveEntries });
    },
  );

  it("reports plain text as unidentified", async () => {
    // arrange
    const detector = createResourceFileFormatDetector();

    // act
    const detected = await detector.detect(plainText());

    // assert
    expect(detected).toEqual({ type: null, archiveEntries: [] });
  });

  it("reports a Word file whose archive directory is cut off as unidentified", async () => {
    // arrange
    const detector = createResourceFileFormatDetector();
    const whole = await wordDocument();
    const truncated = whole.subarray(0, whole.byteLength - 30);

    // act
    const detected = await detector.detect(truncated);

    // assert
    expect(detected).toEqual({ type: null, archiveEntries: [] });
  });
});
