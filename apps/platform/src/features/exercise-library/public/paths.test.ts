import { matchPath } from "react-router";
import { describe, expect, it } from "vitest";

import {
  COACH_TRAINING_PATH,
  COACH_TRAINING_ROUTE_SEGMENT,
  EXERCISE_EDITOR_ROUTE_SEGMENT,
  EXERCISE_LIBRARY_API_PATHS,
  NEW_EXERCISE_PATH,
  NEW_EXERCISE_ROUTE_SEGMENT,
  exerciseEditorPath,
  exercisePath,
} from "./paths";

const EXERCISE_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

describe("exercise library paths", () => {
  it("links the coach to the library the coach portal registers", () => {
    // arrange
    const link = COACH_TRAINING_PATH;

    // act
    const match = matchPath(`/coach/${COACH_TRAINING_ROUTE_SEGMENT}`, link);

    // assert
    expect(link).toBe("/coach/training");
    expect(match).not.toBeNull();
  });

  it("links the coach to the editor of a new exercise", () => {
    // arrange
    const link = NEW_EXERCISE_PATH;

    // act
    const match = matchPath(`/coach/${NEW_EXERCISE_ROUTE_SEGMENT}`, link);

    // assert
    expect(link).toBe("/coach/training/exercises/new");
    expect(match).not.toBeNull();
  });

  it("links the coach to the editor of a saved exercise", () => {
    // arrange
    const link = exerciseEditorPath(EXERCISE_ID);

    // act
    const match = matchPath(`/coach/${EXERCISE_EDITOR_ROUTE_SEGMENT}`, link);

    // assert
    expect(link).toBe(`/coach/training/exercises/${EXERCISE_ID}`);
    expect(match?.params).toEqual({ exerciseId: EXERCISE_ID });
  });

  it("sends a new exercise to the collection and a saved one to its own endpoint", () => {
    // arrange
    const endpoint = exercisePath(EXERCISE_ID);

    // act
    const match = matchPath(EXERCISE_LIBRARY_API_PATHS.exercise, endpoint);

    // assert
    expect(EXERCISE_LIBRARY_API_PATHS.exercises).toBe("/api/coach/exercises");
    expect(endpoint).toBe(`/api/coach/exercises/${EXERCISE_ID}`);
    expect(match?.params).toEqual({ exerciseId: EXERCISE_ID });
  });
});
