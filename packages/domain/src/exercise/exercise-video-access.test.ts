import { describe, expect, it } from "vitest";

import { ExerciseVideoAccess } from "./exercise-video-access";
import type { ExerciseVideoViewer } from "./exercise-video-viewer";

describe("ExerciseVideoAccess", () => {
  it.each<{ viewer: ExerciseVideoViewer; owner: string | null }>([
    {
      viewer: { kind: "coach", accountId: "coach-account-1" },
      owner: "coach-account-1",
    },
    { viewer: { kind: "client", authSubjectId: "user_1" }, owner: null },
    { viewer: { kind: "visitor" }, owner: null },
  ])(
    "opens to a $viewer.kind the videos of the library owned by $owner",
    async ({ viewer, owner }) => {
      // arrange
      const access = new ExerciseVideoAccess();

      // act
      const libraryOwner = await access.libraryOwnerFor(viewer);

      // assert
      expect(libraryOwner).toBe(owner);
    },
  );
});
