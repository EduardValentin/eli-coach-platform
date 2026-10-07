import { describe, expect, it } from "vitest";

import {
  MAX_RESOURCE_FILE_BYTES,
  MAX_RESOURCE_PAGES,
  ResourceFileIntake,
} from "./resource-file-intake";

function pdfOfLength(byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength);
  bytes.set([0x25, 0x50, 0x44, 0x46, 0x2d], 0);

  return bytes;
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

  it("accepts a file of exactly 25 MB with its format and kind", () => {
    // arrange
    const bytes = pdfOfLength(MAX_RESOURCE_FILE_BYTES);

    // act
    const judgement = ResourceFileIntake.judge(bytes);

    // assert
    expect(judgement).toEqual({
      status: "accepted",
      format: "pdf",
      kind: "pdf",
    });
  });

  it("refuses a file one byte over 25 MB as too large", () => {
    // arrange
    const bytes = pdfOfLength(MAX_RESOURCE_FILE_BYTES + 1);

    // act
    const judgement = ResourceFileIntake.judge(bytes);

    // assert
    expect(judgement).toEqual({ status: "refused", refusal: "too-large" });
  });

  it("names the kind of an accepted image", () => {
    // arrange
    const bytes = Uint8Array.of(0xff, 0xd8, 0xff, 0xe0);

    // act
    const judgement = ResourceFileIntake.judge(bytes);

    // assert
    expect(judgement).toEqual({
      status: "accepted",
      format: "jpeg",
      kind: "image",
    });
  });

  it("refuses bytes it cannot identify as an unsupported type", () => {
    // arrange
    const bytes = Uint8Array.from("GIF89a", (character) =>
      character.charCodeAt(0),
    );

    // act
    const judgement = ResourceFileIntake.judge(bytes);

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
