import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

import { pdfWithPages, plainText } from "~test-support/sample-documents";
import {
  LANDSCAPE_SAMPLE_VIDEO_PATH,
  PORTRAIT_SAMPLE_VIDEO_PATH,
} from "~test-support/sample-videos";
import { describe, expect, it } from "vitest";

import { createExerciseVideoFormatDetectorAdapter } from "./create-exercise-video-format-detector-adapter.server";

const LEADING_BYTE_COUNT = 4100;

async function leadingBytesOf(path: string): Promise<Uint8Array> {
  return (await readFile(path)).subarray(0, LEADING_BYTE_COUNT);
}

describe("createExerciseVideoFormatDetector", () => {
  it.each([
    {
      file: "an MP4 video",
      bytes: () => leadingBytesOf(LANDSCAPE_SAMPLE_VIDEO_PATH),
      type: "mp4",
    },
    {
      file: "a QuickTime video",
      bytes: () => leadingBytesOf(PORTRAIT_SAMPLE_VIDEO_PATH),
      type: "mov",
    },
    {
      file: "a PDF",
      bytes: async () =>
        (await pdfWithPages(1)).subarray(0, LEADING_BYTE_COUNT),
      type: "pdf",
    },
  ])("reports the leading bytes of $file as $type", async ({ bytes, type }) => {
    // arrange
    const exerciseVideoFormatDetectorPort =
      createExerciseVideoFormatDetectorAdapter();
    const leadingBytes = await bytes();

    // act
    const detected = await exerciseVideoFormatDetectorPort.detect(leadingBytes);

    // assert
    expect(detected).toBe(type);
  });

  it.each([
    { file: "plain text", bytes: plainText },
    { file: "random bytes", bytes: () => randomBytes(LEADING_BYTE_COUNT) },
    { file: "no bytes", bytes: () => new Uint8Array() },
  ])("reports $file as unidentified", async ({ bytes }) => {
    // arrange
    const exerciseVideoFormatDetectorPort =
      createExerciseVideoFormatDetectorAdapter();

    // act
    const detected = await exerciseVideoFormatDetectorPort.detect(bytes());

    // assert
    expect(detected).toBeNull();
  });
});
