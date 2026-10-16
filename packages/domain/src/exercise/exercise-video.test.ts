import { describe, expect, it } from "vitest";

import {
  ACCEPTED_EXERCISE_VIDEO_MEDIA_TYPES,
  EXERCISE_VIDEO_EXTENSIONS,
  ExerciseVideo,
  MAX_EXERCISE_VIDEO_BYTES,
} from "./exercise-video";
import { InvalidStoredExerciseError } from "./invalid-stored-exercise-error";

const VIDEO_ID = "9c1b0000-0000-4000-8000-000000000001";
const OTHER_VIDEO_ID = "9c1b0000-0000-4000-8000-000000000002";

const STORED = { videoId: VIDEO_ID, format: "mov", sizeBytes: 4_096 };

describe("ExerciseVideo", () => {
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
    { format: "mp4", mediaType: "video/mp4" },
    { format: "mov", mediaType: "video/quicktime" },
  ])("plays a stored $format as $mediaType", ({ format, mediaType }) => {
    // arrange
    const video = ExerciseVideo.fromStored({ ...STORED, format });

    // act
    const played = video.mediaType;

    // assert
    expect(played).toBe(mediaType);
  });

  it("is stored as its own video id only", () => {
    // arrange
    const video = ExerciseVideo.fromStored(STORED);

    // act
    const matches = [
      video.isStoredAs(VIDEO_ID),
      video.isStoredAs(OTHER_VIDEO_ID),
    ];

    // assert
    expect(matches).toEqual([true, false]);
  });

  it.each([
    { description: "one byte", sizeBytes: 1 },
    { description: "exactly 50 MB", sizeBytes: MAX_EXERCISE_VIDEO_BYTES },
  ])("is read back from a stored video of $description", ({ sizeBytes }) => {
    // arrange
    const stored = { ...STORED, sizeBytes };

    // act
    const video = ExerciseVideo.fromStored(stored);

    // assert
    expect(video.toSnapshot()).toEqual(stored);
    expect(video.videoId).toBe(VIDEO_ID);
  });

  it.each([
    {
      description: "a format it does not play",
      field: "format",
      change: { format: "webm" },
    },
    { description: "no bytes", field: "sizeBytes", change: { sizeBytes: 0 } },
    {
      description: "a negative size",
      field: "sizeBytes",
      change: { sizeBytes: -1 },
    },
    {
      description: "a fractional size",
      field: "sizeBytes",
      change: { sizeBytes: 1.5 },
    },
    {
      description: "a size over 50 MB",
      field: "sizeBytes",
      change: { sizeBytes: MAX_EXERCISE_VIDEO_BYTES + 1 },
    },
    {
      description: "a video id that is no UUID",
      field: "videoId",
      change: { videoId: "video-1" },
    },
  ])("refuses a stored video with $description", ({ field, change }) => {
    // arrange
    const stored = { ...STORED, ...change };

    // act
    const reading = () => ExerciseVideo.fromStored(stored);

    // assert
    expect(reading).toThrow(InvalidStoredExerciseError);
    expect(reading).toThrow(`video.${field}`);
  });
});
