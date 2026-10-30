import { describe, expect, it } from "vitest";

import { MAX_EXERCISE_VIDEO_BYTES } from "./exercise-video";
import { ExerciseVideoUpload } from "./exercise-video-upload";
import { InvalidStoredExerciseError } from "./invalid-stored-exercise-error";

const VIDEO_ID = "9c1b0000-0000-4000-8000-000000000001";

describe("ExerciseVideoUpload", () => {
  it.each([
    { detectedType: "mp4", format: "mp4" },
    { detectedType: "mov", format: "mov" },
  ])(
    "accepts content detected as $detectedType as the $format format",
    ({ detectedType, format }) => {
      // arrange
      const facts = { detectedType, sizeBytes: 2_048 };

      // act
      const inspection = ExerciseVideoUpload.inspect(facts);

      // assert
      expect(inspection.status).toBe("accepted");
      expect(
        inspection.status === "accepted" && inspection.upload.toSnapshot(),
      ).toEqual({ format, sizeBytes: 2_048 });
    },
  );

  it("accepts a video of exactly 50 MB", () => {
    // arrange
    const facts = { detectedType: "mp4", sizeBytes: MAX_EXERCISE_VIDEO_BYTES };

    // act
    const inspection = ExerciseVideoUpload.inspect(facts);

    // assert
    expect(inspection.status).toBe("accepted");
  });

  it("refuses a video one byte over 50 MB as too large", () => {
    // arrange
    const facts = {
      detectedType: "mov",
      sizeBytes: MAX_EXERCISE_VIDEO_BYTES + 1,
    };

    // act
    const inspection = ExerciseVideoUpload.inspect(facts);

    // assert
    expect(inspection).toEqual({ status: "refused", refusal: "too-large" });
  });

  it.each([
    { description: "content no detector recognises", detectedType: null },
    { description: "another video container", detectedType: "webm" },
    { description: "a document renamed to .mp4", detectedType: "pdf" },
  ])("refuses $description as unsupported", ({ detectedType }) => {
    // arrange
    const facts = { detectedType, sizeBytes: 2_048 };

    // act
    const inspection = ExerciseVideoUpload.inspect(facts);

    // assert
    expect(inspection).toEqual({ status: "refused", refusal: "unsupported" });
  });

  it("names unsupported content before its size", () => {
    // arrange
    const facts = {
      detectedType: null,
      sizeBytes: MAX_EXERCISE_VIDEO_BYTES + 1,
    };

    // act
    const inspection = ExerciseVideoUpload.inspect(facts);

    // assert
    expect(inspection).toEqual({ status: "refused", refusal: "unsupported" });
  });

  it("becomes the video stored under the id its file was kept as", () => {
    // arrange
    const inspection = ExerciseVideoUpload.inspect({
      detectedType: "mov",
      sizeBytes: 4_096,
    });

    // act
    const video =
      inspection.status === "accepted" && inspection.upload.storedAs(VIDEO_ID);

    // assert
    expect(video && video.toSnapshot()).toEqual({
      videoId: VIDEO_ID,
      format: "mov",
      sizeBytes: 4_096,
    });
  });

  it("refuses to become a video under an id that is no UUID", () => {
    // arrange
    const inspection = ExerciseVideoUpload.inspect({
      detectedType: "mp4",
      sizeBytes: 2_048,
    });

    // act
    const storing = () =>
      inspection.status === "accepted" && inspection.upload.storedAs("video-1");

    // assert
    expect(storing).toThrow(InvalidStoredExerciseError);
  });
});
