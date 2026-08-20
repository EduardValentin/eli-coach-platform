import { describe, expect, it } from "vitest";

import { resolveCoverFormat, resolveDownloadFormat } from "./index";

const PDF_BYTES = bytesOf([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const ZIP_BYTES = bytesOf([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
const EMPTY_ZIP_BYTES = bytesOf([0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00]);
const OLE_BYTES = bytesOf([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);
const JPEG_BYTES = bytesOf([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG_BYTES = bytesOf([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const GIF_BYTES = bytesOf([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
]);
const WEBP_BYTES = riffBytes("WEBP");
const AVIF_BYTES = ftypBytes("avif");
const AVIS_BYTES = ftypBytes("avis");
const TEXT_BYTES = new TextEncoder().encode(
  "# Glute Growth Guide\n\nA line with an em dash — and a tab\there.\r\n",
);

function bytesOf(values: readonly number[]): Uint8Array {
  return Uint8Array.from(values);
}

function riffBytes(brand: string): Uint8Array {
  const bytes = new Uint8Array(16);

  bytes.set(new TextEncoder().encode("RIFF"), 0);
  bytes.set(new TextEncoder().encode(brand), 8);

  return bytes;
}

function ftypBytes(brand: string): Uint8Array {
  const bytes = new Uint8Array(16);

  bytes.set(new TextEncoder().encode("ftyp"), 4);
  bytes.set(new TextEncoder().encode(brand), 8);

  return bytes;
}

describe("resolveDownloadFormat", () => {
  it.each([
    ["guide.pdf", PDF_BYTES, "application/pdf", "pdf"],
    ["bundle.zip", ZIP_BYTES, "application/zip", "zip"],
    ["bundle.zip", EMPTY_ZIP_BYTES, "application/zip", "zip"],
    ["book.epub", ZIP_BYTES, "application/epub+zip", "epub"],
    [
      "plan.xlsx",
      ZIP_BYTES,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "xlsx",
    ],
    [
      "plan.xlsm",
      ZIP_BYTES,
      "application/vnd.ms-excel.sheet.macroEnabled.12",
      "xlsm",
    ],
    ["legacy.xls", OLE_BYTES, "application/vnd.ms-excel", "xls"],
    ["notes.md", TEXT_BYTES, "text/markdown", "md"],
    ["macros.csv", TEXT_BYTES, "text/csv", "csv"],
  ])(
    "resolves %s from its content family",
    (customerFilename, bytes, mimeType, extension) => {
      // arrange
      // act
      const resolution = resolveDownloadFormat({ bytes, customerFilename });

      // assert
      expect(resolution).toEqual({
        status: "resolved",
        format: { extension, mimeType },
      });
    },
  );

  it("resolves an uppercase extension", () => {
    // arrange
    // act
    const resolution = resolveDownloadFormat({
      bytes: PDF_BYTES,
      customerFilename: "GUIDE.PDF",
    });

    // assert
    expect(resolution).toEqual({
      status: "resolved",
      format: { extension: "pdf", mimeType: "application/pdf" },
    });
  });

  it.each([
    ["a PDF declared as a spreadsheet", "plan.xlsx", PDF_BYTES],
    ["an archive declared as a PDF", "guide.pdf", ZIP_BYTES],
    ["an archive declared as legacy Excel", "legacy.xls", ZIP_BYTES],
    ["a binary declared as Markdown", "notes.md", PNG_BYTES],
  ])("rejects %s", (_description, customerFilename, bytes) => {
    // arrange
    // act
    const resolution = resolveDownloadFormat({ bytes, customerFilename });

    // assert
    expect(resolution).toEqual({ status: "content_mismatch" });
  });

  it("rejects text carrying a NUL byte as Markdown", () => {
    // arrange
    const bytes = bytesOf([0x23, 0x20, 0x00, 0x68, 0x69]);

    // act
    const resolution = resolveDownloadFormat({
      bytes,
      customerFilename: "notes.md",
    });

    // assert
    expect(resolution).toEqual({ status: "content_mismatch" });
  });

  it("rejects text that is not valid UTF-8", () => {
    // arrange
    const bytes = bytesOf([0x23, 0x20, 0xff, 0xfe, 0x68]);

    // act
    const resolution = resolveDownloadFormat({
      bytes,
      customerFilename: "data.csv",
    });

    // assert
    expect(resolution).toEqual({ status: "content_mismatch" });
  });

  it.each([
    ["an executable", "installer.exe"],
    ["a compressed tarball", "archive.tar.gz"],
    ["a filename with no extension", "guide"],
    ["a dotfile with no extension", ".gitignore"],
  ])("rejects %s as an unsupported extension", (_description, customerFilename) => {
    // arrange
    // act
    const resolution = resolveDownloadFormat({
      bytes: PDF_BYTES,
      customerFilename,
    });

    // assert
    expect(resolution).toEqual({ status: "unsupported_extension" });
  });

  it("rejects an empty file", () => {
    // arrange
    // act
    const resolution = resolveDownloadFormat({
      bytes: new Uint8Array(),
      customerFilename: "guide.pdf",
    });

    // assert
    expect(resolution).toEqual({ status: "content_mismatch" });
  });
});

describe("resolveCoverFormat", () => {
  it.each([
    ["JPEG", JPEG_BYTES, "image/jpeg", "jpg"],
    ["PNG", PNG_BYTES, "image/png", "png"],
    ["WebP", WEBP_BYTES, "image/webp", "webp"],
    ["AVIF", AVIF_BYTES, "image/avif", "avif"],
    ["AVIF image sequences", AVIS_BYTES, "image/avif", "avif"],
  ])("resolves %s from its signature alone", (_label, bytes, mimeType, extension) => {
    // arrange
    // act
    const resolution = resolveCoverFormat(bytes);

    // assert
    expect(resolution).toEqual({
      status: "resolved",
      format: { extension, mimeType },
    });
  });

  it.each([
    ["GIF, which the catalog stores but this workflow does not accept", GIF_BYTES],
    ["a PDF", PDF_BYTES],
    ["a RIFF container that is not WebP", riffBytes("WAVE")],
    ["an ISO container that is not AVIF", ftypBytes("mp42")],
    ["bytes too short to carry a signature", bytesOf([0xff, 0xd8])],
    ["an empty file", new Uint8Array()],
  ])("rejects %s", (_description, bytes) => {
    // arrange
    // act
    const resolution = resolveCoverFormat(bytes);

    // assert
    expect(resolution).toEqual({ status: "unsupported_content" });
  });
});
