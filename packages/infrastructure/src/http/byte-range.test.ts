import { describe, expect, it } from "vitest";

import { parseByteRange } from "./byte-range";

describe("parseByteRange", () => {
  it.each([
    { header: "bytes=0-499", requested: { kind: "from", start: 0, end: 499 } },
    {
      header: "bytes=500-",
      requested: { kind: "from", start: 500, end: null },
    },
    { header: "bytes=7-7", requested: { kind: "from", start: 7, end: 7 } },
    { header: "bytes=-500", requested: { kind: "suffix", length: 500 } },
    { header: "bytes=-0", requested: { kind: "suffix", length: 0 } },
    { header: "Bytes=0-1", requested: { kind: "from", start: 0, end: 1 } },
    { header: " bytes=0-1 ", requested: { kind: "from", start: 0, end: 1 } },
    { header: "bytes= 0-1", requested: { kind: "from", start: 0, end: 1 } },
  ])("reads $header as one requested range", ({ header, requested }) => {
    // arrange
    const value = header;

    // act
    const parsed = parseByteRange(value);

    // assert
    expect(parsed).toEqual(requested);
  });

  it.each([
    { header: null },
    { header: "" },
    { header: "bytes=" },
    { header: "bytes=-" },
    { header: "bytes=0-1,5-6" },
    { header: "bytes=0-1," },
    { header: "items=0-1" },
    { header: "bytes 0-1" },
    { header: "bytes=a-1" },
    { header: "bytes=0-1b" },
    { header: "bytes=+1-2" },
    { header: "bytes=1.5-2" },
    { header: "bytes=0 - 1" },
    { header: "bytes=500-499" },
    { header: "bytes=99999999999999999999-" },
  ])("ignores $header", ({ header }) => {
    // arrange
    const value = header;

    // act
    const parsed = parseByteRange(value);

    // assert
    expect(parsed).toBeNull();
  });
});
