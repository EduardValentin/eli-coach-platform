import { describe, expect, it } from "vitest";

import { ExerciseVideo } from "./exercise-video";

describe("ExerciseVideo", () => {
  it.each([
    { format: "mp4", mediaType: "video/mp4" },
    { format: "mov", mediaType: "video/quicktime" },
  ] as const)(
    "plays a stored $format as $mediaType",
    ({ format, mediaType }) => {
      // arrange
      const video = ExerciseVideo.of({
        videoId: "video-1",
        format,
        sizeBytes: 2_048,
      });

      // act
      const played = video.mediaType;

      // assert
      expect(played).toBe(mediaType);
    },
  );

  it("is stored as its own video id only", () => {
    // arrange
    const video = ExerciseVideo.of({
      videoId: "video-1",
      format: "mp4",
      sizeBytes: 2_048,
    });

    // act
    const matches = [video.isStoredAs("video-1"), video.isStoredAs("video-2")];

    // assert
    expect(matches).toEqual([true, false]);
  });

  it("answers the snapshot it was made of", () => {
    // arrange
    const snapshot = {
      videoId: "video-1",
      format: "mov",
      sizeBytes: 4_096,
    } as const;

    // act
    const video = ExerciseVideo.of(snapshot);

    // assert
    expect(video.toSnapshot()).toEqual(snapshot);
    expect(video.videoId).toBe("video-1");
  });
});
