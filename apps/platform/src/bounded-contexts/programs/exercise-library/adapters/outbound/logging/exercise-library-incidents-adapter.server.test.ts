import { afterEach, describe, expect, it, vi } from "vitest";

import { ConsoleLoggerAdapter } from "~/shared/logging/console-logger-adapter.server";

import { ExerciseLibraryIncidentsAdapter } from "./exercise-library-incidents-adapter.server";

describe("createExerciseLibraryIncidents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs an exercise that could not be created by the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const exerciseLibraryIncidentsAdapter = new ExerciseLibraryIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );
    const cause = Object.assign(new Error("secret row contents"), {
      code: "ECONNREFUSED",
    });

    // act
    exerciseLibraryIncidentsAdapter.exerciseCreationFailed({ error: cause });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Exercise could not be created.",
      {
        errorCategory: "exercise_creation_failure",
        errorClass: "Error",
        errorCode: "ECONNREFUSED",
      },
    );
  });

  it("logs an exercise edit that could not be written by its id and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const exerciseLibraryIncidentsAdapter = new ExerciseLibraryIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );
    const cause = Object.assign(new Error("secret row contents"), {
      code: "ECONNREFUSED",
    });

    // act
    exerciseLibraryIncidentsAdapter.exerciseEditFailed({
      exerciseId: "exercise-1",
      error: cause,
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Exercise edit could not be written.",
      {
        errorCategory: "exercise_edit_failure",
        errorClass: "Error",
        errorCode: "ECONNREFUSED",
        exerciseId: "exercise-1",
      },
    );
  });

  it("logs an exercise restore that could not be written by its id and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const exerciseLibraryIncidentsAdapter = new ExerciseLibraryIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );
    const cause = Object.assign(new Error("secret row contents"), {
      code: "ECONNREFUSED",
    });

    // act
    exerciseLibraryIncidentsAdapter.exerciseRestoreFailed({
      exerciseId: "exercise-1",
      error: cause,
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Exercise restore could not be written.",
      {
        errorCategory: "exercise_restore_failure",
        errorClass: "Error",
        errorCode: "ECONNREFUSED",
        exerciseId: "exercise-1",
      },
    );
  });

  it("logs an exercise video file it could not remove by its video id and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const exerciseLibraryIncidentsAdapter = new ExerciseLibraryIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );
    const cause = Object.assign(new Error("/srv/exercise-videos/videos/x"), {
      code: "EACCES",
    });

    // act
    exerciseLibraryIncidentsAdapter.videoCleanupFailed({
      videoId: "video-1",
      error: cause,
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Exercise video file could not be removed.",
      {
        errorCategory: "exercise_video_cleanup_failure",
        errorClass: "Error",
        errorCode: "EACCES",
        videoId: "video-1",
      },
    );
  });

  it("logs a staged exercise video upload it could not discard by its staging id and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const exerciseLibraryIncidentsAdapter = new ExerciseLibraryIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );
    const cause = Object.assign(new Error("/srv/exercise-videos/.incoming/x"), {
      code: "EACCES",
    });

    // act
    exerciseLibraryIncidentsAdapter.videoCleanupFailed({
      stagingId: "staging-1",
      error: cause,
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Exercise video file could not be removed.",
      {
        errorCategory: "exercise_video_cleanup_failure",
        errorClass: "Error",
        errorCode: "EACCES",
        stagingId: "staging-1",
      },
    );
  });
});
