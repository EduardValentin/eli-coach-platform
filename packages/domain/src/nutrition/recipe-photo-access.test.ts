import { describe, expect, it } from "vitest";

import { Recipe } from "./recipe";
import { RecipePhotoAccess } from "./recipe-photo-access";
import type { RecipePhotoViewer } from "./recipe-photo-viewer";

const STORED_AT = new Date("2026-10-15T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";

const PORRIDGE = Recipe.reconstitute({
  id: "r0000000-0000-4000-8000-000000000001",
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Porridge",
  ingredients: [],
  prepMinutes: 5,
  cookMinutes: 10,
  instructions: "",
  icon: null,
  mealRoleIds: [],
  tagIds: [],
  photo: { photoId: "7a1b0000-0000-4000-8000-000000000001" },
  archivedAt: null,
  createdAt: STORED_AT,
  updatedAt: STORED_AT,
});

const COACH: RecipePhotoViewer = { kind: "coach", accountId: COACH_ACCOUNT_ID };
const CLIENT: RecipePhotoViewer = { kind: "client", authSubjectId: "user_1" };
const VISITOR: RecipePhotoViewer = { kind: "visitor" };

describe("RecipePhotoAccess", () => {
  it.each<{ viewer: RecipePhotoViewer; owner: string | null }>([
    { viewer: COACH, owner: COACH_ACCOUNT_ID },
    { viewer: CLIENT, owner: null },
    { viewer: VISITOR, owner: null },
  ])(
    "looks in the library owned by $owner for a $viewer.kind's photo",
    async ({ viewer, owner }) => {
      // arrange
      const access = new RecipePhotoAccess();

      // act
      const libraryOwner = await access.libraryOwnerAccountIdFor(viewer);

      // assert
      expect(libraryOwner).toBe(owner);
    },
  );

  it.each<{ viewer: RecipePhotoViewer; admitted: boolean }>([
    { viewer: COACH, admitted: true },
    { viewer: CLIENT, admitted: false },
    { viewer: VISITOR, admitted: false },
  ])(
    "lets a $viewer.kind see the photo: $admitted",
    async ({ viewer, admitted }) => {
      // arrange
      const access = new RecipePhotoAccess();

      // act
      const admits = await access.admits(viewer, PORRIDGE);

      // assert
      expect(admits).toBe(admitted);
    },
  );
});
