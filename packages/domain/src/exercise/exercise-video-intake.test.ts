import { describe, expect, it } from "vitest";

import {
  ACCEPTED_EXERCISE_VIDEO_MEDIA_TYPES,
  EXERCISE_VIDEO_EXTENSIONS,
  ExerciseVideoIntake,
  MAX_EXERCISE_VIDEO_BYTES,
} from "./exercise-video-intake";

describe("ExerciseVideoIntake", () => {
  it("caps a video at 50 MB and offers the browser .mp4 and .mov", () => {
    // arrange
    const fiftyMegabytes = 50 * 1024 * 1024;

    // act
    const limits = {
      maxBytes: MAX_EXERCISE_VIDEO_BYTES,
      extensions: EXERCISE_VIDEO_EXTENSIONS,
      mediaTypes: ACCEPTED_EXERCISE_VIDEO_MEDIA_TYPES,
    };

    // assert
    expect(limits).toEqual({
      maxBytes: fiftyMegabytes,
      extensions: ["mp4", "mov"],
      mediaTypes: ["video/mp4", "video/quicktime"],
    });
  });

  it.each([
    { detectedType: "mp4", format: "mp4" },
    { detectedType: "mov", format: "mov" },
  ])(
    "accepts content detected as $detectedType as the $format format",
    ({ detectedType, format }) => {
      // arrange
      const facts = { detectedType, sizeBytes: 2_048 };

      // act
      const judgement = ExerciseVideoIntake.judge(facts);

      // assert
      expect(judgement).toEqual({ status: "accepted", format });
    },
  );

  it("accepts a video of exactly 50 MB", () => {
    // arrange
    const facts = { detectedType: "mp4", sizeBytes: MAX_EXERCISE_VIDEO_BYTES };

    // act
    const judgement = ExerciseVideoIntake.judge(facts);

    // assert
    expect(judgement).toEqual({ status: "accepted", format: "mp4" });
  });

  it("refuses a video one byte over 50 MB as too large", () => {
    // arrange
    const facts = {
      detectedType: "mov",
      sizeBytes: MAX_EXERCISE_VIDEO_BYTES + 1,
    };

    // act
    const judgement = ExerciseVideoIntake.judge(facts);

    // assert
    expect(judgement).toEqual({ status: "refused", refusal: "too-large" });
  });

  it.each([
    { description: "content no detector recognises", detectedType: null },
    { description: "another video container", detectedType: "webm" },
    { description: "a document renamed to .mp4", detectedType: "pdf" },
  ])("refuses $description as unsupported", ({ detectedType }) => {
    // arrange
    const facts = { detectedType, sizeBytes: 2_048 };

    // act
    const judgement = ExerciseVideoIntake.judge(facts);

    // assert
    expect(judgement).toEqual({ status: "refused", refusal: "unsupported" });
  });

  it("names unsupported content before its size", () => {
    // arrange
    const facts = {
      detectedType: null,
      sizeBytes: MAX_EXERCISE_VIDEO_BYTES + 1,
    };

    // act
    const judgement = ExerciseVideoIntake.judge(facts);

    // assert
    expect(judgement).toEqual({ status: "refused", refusal: "unsupported" });
  });
});
