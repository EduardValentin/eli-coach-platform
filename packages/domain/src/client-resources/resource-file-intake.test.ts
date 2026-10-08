import { describe, expect, it } from "vitest";

import type { DetectedResourceFile } from "./resource-file-format-detector";
import {
  MAX_RESOURCE_FILE_BYTES,
  MAX_RESOURCE_PAGES,
  ResourceFileIntake,
} from "./resource-file-intake";

function detected(
  type: string | null,
  archiveEntries: readonly string[] = [],
): DetectedResourceFile {
  return { type, archiveEntries };
}

describe("ResourceFileIntake", () => {
  it("sets the limits at 25 MB and 50 pages", () => {
    // arrange
    const twentyFiveMegabytes = 25 * 1024 * 1024;

    // act
    const limits = [MAX_RESOURCE_FILE_BYTES, MAX_RESOURCE_PAGES];

    // assert
    expect(limits).toEqual([twentyFiveMegabytes, 50]);
  });

  it("accepts a file of exactly 25 MB", () => {
    // arrange
    const byteLength = MAX_RESOURCE_FILE_BYTES;

    // act
    const judgement = ResourceFileIntake.judgeSize(byteLength);

    // assert
    expect(judgement).toEqual({ status: "accepted" });
  });

  it("refuses a file one byte over 25 MB as too large", () => {
    // arrange
    const byteLength = MAX_RESOURCE_FILE_BYTES + 1;

    // act
    const judgement = ResourceFileIntake.judgeSize(byteLength);

    // assert
    expect(judgement).toEqual({ status: "refused", refusal: "too-large" });
  });

  it.each([
    { type: "pdf", format: "pdf", kind: "pdf" },
    { type: "jpg", format: "jpeg", kind: "image" },
    { type: "png", format: "png", kind: "image" },
    { type: "webp", format: "webp", kind: "image" },
    { type: "docx", format: "docx", kind: "word" },
    { type: "odt", format: "odt", kind: "word" },
    { type: "doc", format: "doc", kind: "word" },
    { type: "xlsx", format: "xlsx", kind: "excel" },
    { type: "ods", format: "ods", kind: "excel" },
    { type: "xls", format: "xls", kind: "excel" },
  ])(
    "accepts a detected $type as $format of kind $kind",
    ({ type, format, kind }) => {
      // arrange
      const file = detected(type);

      // act
      const judgement = ResourceFileIntake.judgeFormat(file);

      // assert
      expect(judgement).toEqual({ status: "accepted", format, kind });
    },
  );

  it.each([
    { description: "an unidentified file", file: detected(null) },
    {
      description: "a Word file carrying a macro project",
      file: detected("docx", [
        "[Content_Types].xml",
        "word/document.xml",
        "word/vbaProject.bin",
      ]),
    },
    {
      description: "an Excel file carrying a macro project",
      file: detected("xlsx", [
        "[Content_Types].xml",
        "xl/workbook.xml",
        "xl/vbaProject.bin",
      ]),
    },
    { description: "a macro-enabled Word file", file: detected("docm") },
    { description: "a macro-enabled Excel file", file: detected("xlsm") },
    { description: "a PowerPoint file", file: detected("pptx") },
    { description: "a legacy PowerPoint file", file: detected("ppt") },
    { description: "a Windows installer", file: detected("msi") },
    { description: "an unrecognised compound file", file: detected("cfb") },
    { description: "a plain zip archive", file: detected("zip") },
    { description: "a GIF", file: detected("gif") },
    { description: "a Windows program", file: detected("exe") },
  ])("refuses $description as an unsupported type", ({ file }) => {
    // arrange
    const detectedFile = file;

    // act
    const judgement = ResourceFileIntake.judgeFormat(detectedFile);

    // assert
    expect(judgement).toEqual({
      status: "refused",
      refusal: "unsupported-type",
    });
  });

  it.each([
    [1, { status: "accepted" }],
    [MAX_RESOURCE_PAGES, { status: "accepted" }],
    [MAX_RESOURCE_PAGES + 1, { status: "refused", refusal: "too-many-pages" }],
    [0, { status: "refused", refusal: "unreadable" }],
  ])("judges a document of %i pages", (pageCount, expected) => {
    // arrange
    const pages = pageCount;

    // act
    const judgement = ResourceFileIntake.judgePageCount(pages);

    // assert
    expect(judgement).toEqual(expected);
  });
});
