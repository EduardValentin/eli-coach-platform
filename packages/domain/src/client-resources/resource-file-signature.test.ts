import { describe, expect, it } from "vitest";

import { detectResourceFileFormat } from "./resource-file-signature";

function ascii(text: string): number[] {
  return Array.from(text, (character) => character.charCodeAt(0));
}

describe("detectResourceFileFormat", () => {
  it.each([
    {
      description: "a PDF",
      bytes: Uint8Array.of(...ascii("%PDF-1.7\n"), ...new Uint8Array(32)),
      format: "pdf",
    },
    {
      description: "a JPEG",
      bytes: Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, 0, 0x10),
      format: "jpeg",
    },
    {
      description: "a PNG",
      bytes: Uint8Array.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0,
      ]),
      format: "png",
    },
    {
      description: "a WebP",
      bytes: Uint8Array.of(...ascii("RIFF"), 4, 0, 0, 0, ...ascii("WEBPVP8 ")),
      format: "webp",
    },
  ])("recognises $description from its bytes", ({ bytes, format }) => {
    // arrange
    const file = bytes;

    // act
    const detected = detectResourceFileFormat(file);

    // assert
    expect(detected).toBe(format);
  });

  it.each([
    { description: "an empty file", bytes: new Uint8Array(0) },
    {
      description: "plain text",
      bytes: Uint8Array.of(...ascii("Just some notes about squats.")),
    },
    {
      description: "an executable",
      bytes: Uint8Array.of(...ascii("MZ"), ...new Uint8Array(64)),
    },
    { description: "a GIF", bytes: Uint8Array.of(...ascii("GIF89a")) },
  ])("refuses $description", ({ bytes }) => {
    // arrange
    const file = bytes;

    // act
    const detected = detectResourceFileFormat(file);

    // assert
    expect(detected).toBeNull();
  });
});
