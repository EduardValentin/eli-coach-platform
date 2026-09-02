import { describe, expect, it } from "vitest";

import {
  buildExerciseVideoAssetKey,
  hasExerciseVideoExtension,
  resolveExerciseVideoFormat,
} from "./exercise-video-format";

function ftyp(majorBrand: string, compatible: string[] = []): Uint8Array {
  const size = 16 + 4 * compatible.length;
  const bytes = new Uint8Array(size + 8);

  new DataView(bytes.buffer).setUint32(0, size);
  bytes.set([0x66, 0x74, 0x79, 0x70], 4);
  bytes.set(new TextEncoder().encode(majorBrand), 8);
  bytes.set([0, 0, 2, 0], 12);
  compatible.forEach((brand, index) => {
    bytes.set(new TextEncoder().encode(brand), 16 + 4 * index);
  });

  return bytes;
}

describe("resolveExerciseVideoFormat", () => {
  it.each([["isom"], ["mp42"], ["avc1"], ["M4V "]])(
    "accepts an MP4 whose major brand is %s",
    (brand) => {
      // arrange, act
      const resolution = resolveExerciseVideoFormat(ftyp(brand));

      // assert
      expect(resolution).toEqual({ status: "resolved" });
    },
  );

  it("accepts a file whose compatible brands include an MP4 brand", () => {
    // arrange, act
    const resolution = resolveExerciseVideoFormat(ftyp("dby1", ["iso6", "mp41"]));

    // assert
    expect(resolution).toEqual({ status: "resolved" });
  });

  it("rejects QuickTime, other containers and short files", () => {
    // arrange
    const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0]);

    // act, assert
    expect(resolveExerciseVideoFormat(ftyp("qt  "))).toEqual({
      status: "unsupported_content",
    });
    expect(resolveExerciseVideoFormat(webm)).toEqual({
      status: "unsupported_content",
    });
    expect(resolveExerciseVideoFormat(new Uint8Array(5))).toEqual({
      status: "unsupported_content",
    });
  });
});

describe("hasExerciseVideoExtension", () => {
  it("accepts .mp4 case-insensitively and nothing else", () => {
    // arrange, act, assert
    expect(hasExerciseVideoExtension("squat.MP4")).toBe(true);
    expect(hasExerciseVideoExtension("squat.mov")).toBe(false);
    expect(hasExerciseVideoExtension("mp4")).toBe(false);
  });
});

describe("buildExerciseVideoAssetKey", () => {
  it("addresses the video by its digest under the exercise-videos folder", () => {
    // arrange, act, assert
    expect(buildExerciseVideoAssetKey("a".repeat(64))).toBe(
      `exercise-videos/${"a".repeat(64)}.mp4`,
    );
  });
});
