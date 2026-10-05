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
    ["pdf", 12, "pdf", true, "application/pdf"],
    ["png", 1, "image", true, "image/png"],
    [
      "docx",
      null,
      "word",
      false,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    ["doc", null, "word", false, "application/msword"],
    ["odt", null, "word", false, "application/vnd.oasis.opendocument.text"],
    [
      "xlsx",
      null,
      "excel",
      false,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    ["xls", null, "excel", false, "application/vnd.ms-excel"],
    [
      "ods",
      null,
      "excel",
      false,
      "application/vnd.oasis.opendocument.spreadsheet",
    ],
  ] as const)(
    "describes a %s file by its detected format",
    (format, pageCount, kind, previewed, mimeType) => {
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
    [1, true],
    [3, true],
    [0, false],
    [4, false],
    [1.5, false],
  ])("knows whether a three-page PDF has page %s", (pageNumber, expected) => {
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
    });
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
});
