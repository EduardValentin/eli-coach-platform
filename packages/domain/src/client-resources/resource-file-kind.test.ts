import { describe, expect, it } from "vitest";

import {
  RESOURCE_FILE_EXTENSIONS,
  resourceFileKindOfExtension,
} from "./resource-file-kind";

describe("resource file extensions", () => {
  it("lists every extension a coach may pick, documents first and images last", () => {
    // arrange
    const expected = [
      "pdf",
      "doc",
      "docx",
      "odt",
      "xls",
      "xlsx",
      "ods",
      "jpg",
      "jpeg",
      "png",
      "webp",
    ];

    // act
    const extensions = RESOURCE_FILE_EXTENSIONS;

    // assert
    expect(extensions).toEqual(expected);
  });

  it.each([
    { extension: "pdf", kind: "pdf" },
    { extension: "DOCX", kind: "word" },
    { extension: "ods", kind: "excel" },
    { extension: "jpeg", kind: "image" },
    { extension: "pptx", kind: null },
    { extension: "", kind: null },
  ])("names the kind of a .$extension file: $kind", ({ extension, kind }) => {
    // arrange
    // act
    const found = resourceFileKindOfExtension(extension);

    // assert
    expect(found).toBe(kind);
  });
});
