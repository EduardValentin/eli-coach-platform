import { describe, expect, it } from "vitest";

import {
  COACH_TRAINING_PATH,
  exerciseEditorPath,
} from "~/features/exercise-library/public/paths";

import {
  libraryReturnPath,
  libraryReturnState,
  returnPathAfterSave,
} from "./library-address";

const LIBRARY_SEARCH = "?type=cardio&sort=difficulty&page=2";
const EXERCISE_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

describe("the library's address carried into the editor", () => {
  it("returns to the library with the search she left it on", () => {
    // arrange
    const state = libraryReturnState(LIBRARY_SEARCH);

    // act
    const path = libraryReturnPath(state);

    // assert
    expect(path).toBe(`${COACH_TRAINING_PATH}${LIBRARY_SEARCH}`);
  });

  it("returns to the plain library when she left it with no search", () => {
    // arrange
    const state = libraryReturnState("");

    // act
    const path = libraryReturnPath(state);

    // assert
    expect(path).toBe(COACH_TRAINING_PATH);
  });

  it.each([
    ["no state", null],
    ["a state without the library", { from: "elsewhere" }],
    ["a library that is not a search", { library: "https://example.com" }],
    ["a library that is not text", { library: 2 }],
  ])("returns to the plain library from %s", (_case, state) => {
    // arrange, act
    const path = libraryReturnPath(state);

    // assert
    expect(path).toBe(COACH_TRAINING_PATH);
  });

  it("lands a save that redirects to the library on the view she came from", () => {
    // arrange
    const libraryPath = `${COACH_TRAINING_PATH}${LIBRARY_SEARCH}`;

    // act
    const path = returnPathAfterSave(COACH_TRAINING_PATH, libraryPath);

    // assert
    expect(path).toBe(libraryPath);
  });

  it("follows a save that redirects anywhere else as it is", () => {
    // arrange
    const libraryPath = `${COACH_TRAINING_PATH}${LIBRARY_SEARCH}`;
    const elsewhere = exerciseEditorPath(EXERCISE_ID);

    // act
    const path = returnPathAfterSave(elsewhere, libraryPath);

    // assert
    expect(path).toBe(elsewhere);
  });
});
