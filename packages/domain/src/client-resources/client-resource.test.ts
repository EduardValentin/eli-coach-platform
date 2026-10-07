import { describe, expect, it } from "vitest";

import { ClientResource, ResourceFile } from "./client-resource";
import { ResourceDetails } from "./resource-details";

const ADDED_AT = new Date("2026-10-05T09:00:00.000Z");

function details(): ResourceDetails {
  const result = ResourceDetails.from({
    title: "Meal plan",
    description: "Week one",
  });

  if (result.status !== "valid") throw new Error("invalid sample details");

  return result.details;
}

describe("ResourceFile", () => {
  it.each([
    {
      format: "pdf",
      pageCount: 12,
      kind: "pdf",
      previewed: true,
      mimeType: "application/pdf",
    },
    {
      format: "png",
      pageCount: 1,
      kind: "image",
      previewed: true,
      mimeType: "image/png",
    },
    {
      format: "docx",
      pageCount: null,
      kind: "word",
      previewed: false,
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    {
      format: "doc",
      pageCount: null,
      kind: "word",
      previewed: false,
      mimeType: "application/msword",
    },
    {
      format: "odt",
      pageCount: null,
      kind: "word",
      previewed: false,
      mimeType: "application/vnd.oasis.opendocument.text",
    },
    {
      format: "xlsx",
      pageCount: null,
      kind: "excel",
      previewed: false,
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    {
      format: "xls",
      pageCount: null,
      kind: "excel",
      previewed: false,
      mimeType: "application/vnd.ms-excel",
    },
    {
      format: "ods",
      pageCount: null,
      kind: "excel",
      previewed: false,
      mimeType: "application/vnd.oasis.opendocument.spreadsheet",
    },
  ] as const)(
    "describes a $format file by its detected format",
    ({ format, pageCount, kind, previewed, mimeType }) => {
      // arrange
      const snapshot = {
        originalName: "file",
        format,
        sizeBytes: 10,
        pageCount,
      };

      // act
      const file = ResourceFile.of(snapshot);

      // assert
      expect({
        kind: file.kind,
        hasPagePreview: file.hasPagePreview(),
        mimeType: file.mimeType,
      }).toEqual({ kind, hasPagePreview: previewed, mimeType });
    },
  );

  it.each([
    { pageNumber: 1, expected: true },
    { pageNumber: 3, expected: true },
    { pageNumber: 0, expected: false },
    { pageNumber: 4, expected: false },
    { pageNumber: 1.5, expected: false },
  ])(
    "knows whether a three-page PDF has page $pageNumber",
    ({ pageNumber, expected }) => {
      // arrange
      const file = ResourceFile.of({
        originalName: "plan.pdf",
        format: "pdf",
        sizeBytes: 10,
        pageCount: 3,
      });

      // act
      const result = file.hasPage(pageNumber);

      // assert
      expect(result).toBe(expected);
    },
  );

  describe("download name", () => {
    const LONG_STEM = "a".repeat(300);

    it.each([
      {
        case: "keeps an honest name unchanged",
        originalName: "Glute guide.pdf",
        format: "pdf",
        downloadName: "Glute guide.pdf",
      },
      {
        case: "keeps an honest extension in any letter case",
        originalName: "Glute guide.PDF",
        format: "pdf",
        downloadName: "Glute guide.PDF",
      },
      {
        case: "keeps another extension of the same format",
        originalName: "posture.jpeg",
        format: "jpeg",
        downloadName: "posture.jpeg",
      },
      {
        case: "replaces an extension the bytes contradict",
        originalName: "plan.html",
        format: "pdf",
        downloadName: "plan.pdf",
      },
      {
        case: "appends the extension to a name without one",
        originalName: "plan",
        format: "pdf",
        downloadName: "plan.pdf",
      },
      {
        case: "pins a macro-enabled name to the Word document it is",
        originalName: "Recipes.docm",
        format: "docx",
        downloadName: "Recipes.docx",
      },
      {
        case: "names a JPEG photo with its canonical extension",
        originalName: "posture.heic",
        format: "jpeg",
        downloadName: "posture.jpg",
      },
      {
        case: "shortens an over-long name and keeps its extension",
        originalName: `${LONG_STEM}.pdf`,
        format: "pdf",
        downloadName: `${"a".repeat(251)}.pdf`,
      },
      {
        case: "strips a right-to-left override that disguises the extension",
        originalName: "invoice\u202Efdp.exe",
        format: "pdf",
        downloadName: "invoicefdp.pdf",
      },
      {
        case: "strips control and bidirectional characters",
        originalName:
          "\u0000me\u0007al\u001F \u007Fpl\u0085an\u009F\u200E\u200F\u202A\u202B\u202C\u202D\u2066\u2067\u2068\u2069.xlsx",
        format: "xlsx",
        downloadName: "meal plan.xlsx",
      },
      {
        case: "strips invisible marks, separators and byte order marks",
        originalName: "\uFEFFme\u061Cal\u200B \u200Cpl\u200Dan\u2028\u2029.pdf",
        format: "pdf",
        downloadName: "meal plan.pdf",
      },
      {
        case: "names a file that came without a name",
        originalName: "",
        format: "pdf",
        downloadName: "resource.pdf",
      },
      {
        case: "names a file whose name was only characters it strips",
        originalName: "\u202E\u200B\uFEFF",
        format: "pdf",
        downloadName: "resource.pdf",
      },
    ] as const)("$case", ({ originalName, format, downloadName }) => {
      // arrange
      const file = ResourceFile.of({
        originalName,
        format,
        sizeBytes: 10,
        pageCount: null,
      });

      // act
      const name = file.downloadName();

      // assert
      expect(name).toBe(downloadName);
    });

    it("never splits a character when it shortens a name", () => {
      // arrange
      const file = ResourceFile.of({
        originalName: `${"😀".repeat(300)}.pdf`,
        format: "pdf",
        sizeBytes: 10,
        pageCount: 3,
      });

      // act
      const name = file.downloadName();

      // assert
      expect(Array.from(name)).toHaveLength(255);
      expect(name).toBe(`${"😀".repeat(251)}.pdf`);
    });
  });

  it("has no pages for a Word file", () => {
    // arrange
    const file = ResourceFile.of({
      originalName: "plan.docx",
      format: "docx",
      sizeBytes: 10,
      pageCount: null,
    });

    // act
    const result = file.hasPage(1);

    // assert
    expect(result).toBe(false);
  });
});

describe("ClientResource", () => {
  it("records what the coach added for a client", () => {
    // arrange
    const file = ResourceFile.of({
      originalName: "plan.pdf",
      format: "pdf",
      sizeBytes: 2_048,
      pageCount: 4,
    });

    // act
    const resource = ClientResource.added({
      id: "resource-1",
      clientId: "client-1",
      details: details(),
      file,
      at: ADDED_AT,
    });

    // assert
    expect(resource.toSnapshot()).toEqual({
      id: "resource-1",
      clientId: "client-1",
      title: "Meal plan",
      description: "Week one",
      file: {
        originalName: "plan.pdf",
        format: "pdf",
        sizeBytes: 2_048,
        pageCount: 4,
      },
      addedAt: ADDED_AT,
      openedAt: null,
    });
    expect(resource.isUnopened()).toBe(true);
  });

  it("knows which client it is for", () => {
    // arrange
    const resource = ClientResource.reconstitute({
      id: "resource-1",
      clientId: "client-1",
      title: "Meal plan",
      description: "",
      file: {
        originalName: "plan.xlsx",
        format: "xlsx",
        sizeBytes: 10,
        pageCount: null,
      },
      addedAt: ADDED_AT,
      openedAt: null,
    });

    // act
    const answers = [resource.isFor("client-1"), resource.isFor("client-2")];

    // assert
    expect(answers).toEqual([true, false]);
    expect(resource.storageOwner()).toEqual({
      clientId: "client-1",
      resourceId: "resource-1",
    });
    expect(resource.file.kind).toBe("excel");
  });

  describe("opening", () => {
    const OPENED_AT = new Date("2026-10-06T08:00:00.000Z");
    const LATER = new Date("2026-10-07T08:00:00.000Z");

    function unopened(): ClientResource {
      return ClientResource.reconstitute({
        id: "resource-1",
        clientId: "client-1",
        title: "Meal plan",
        description: "",
        file: {
          originalName: "plan.pdf",
          format: "pdf",
          sizeBytes: 10,
          pageCount: 1,
        },
        addedAt: ADDED_AT,
        openedAt: null,
      });
    }

    it("records the moment she first opens it", () => {
      // arrange
      const resource = unopened();

      // act
      const opened = resource.opened(OPENED_AT);

      // assert
      expect(opened.isUnopened()).toBe(false);
      expect(opened.toSnapshot().openedAt).toEqual(OPENED_AT);
      expect(resource.isUnopened()).toBe(true);
    });

    it("never moves the moment once she has opened it", () => {
      // arrange
      const opened = unopened().opened(OPENED_AT);

      // act
      const reopened = opened.opened(LATER);

      // assert
      expect(reopened.toSnapshot().openedAt).toEqual(OPENED_AT);
    });
  });
});
