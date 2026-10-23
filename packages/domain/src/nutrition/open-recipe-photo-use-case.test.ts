import { describe, expect, it, vi } from "vitest";

import { OpenRecipePhotoUseCase } from "./open-recipe-photo-use-case";
import { Recipe, type RecipeSnapshot } from "./recipe";
import type { RecipeLibrary, RecipeReference } from "./recipe-library";
import type {
  RecipePhotoOpening,
  RecipePhotoStore,
} from "./recipe-photo-store";
import type { RecipePhotoViewer } from "./recipe-photo-viewer";

const STORED_AT = new Date("2026-10-15T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";
const RECIPE_ID = "r0000000-0000-4000-8000-000000000001";
const PHOTO_ID = "7a1b0000-0000-4000-8000-000000000001";
const COACH: RecipePhotoViewer = { kind: "coach", accountId: COACH_ACCOUNT_ID };

const PORRIDGE: RecipeSnapshot = {
  id: RECIPE_ID,
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Porridge",
  ingredients: [],
  prepMinutes: 5,
  cookMinutes: 10,
  instructions: "",
  icon: null,
  mealRoleIds: [],
  tagIds: [],
  photo: { photoId: PHOTO_ID },
  archivedAt: null,
  createdAt: STORED_AT,
  updatedAt: STORED_AT,
};

const BYTES: AsyncIterable<Uint8Array> = {
  async *[Symbol.asyncIterator]() {
    yield new Uint8Array([1, 2, 3]);
  },
};

function createUseCase(snapshot: RecipeSnapshot | null = PORRIDGE) {
  const recipes = {
    find: vi.fn(async ({ ownerAccountId, recipeId }: RecipeReference) =>
      snapshot?.ownerAccountId === ownerAccountId && snapshot.id === recipeId
        ? Recipe.reconstitute(snapshot)
        : null,
    ),
  } satisfies Pick<RecipeLibrary, "find">;
  const store = {
    open: vi.fn(async (_photoId: string): Promise<RecipePhotoOpening> => ({
      status: "opened",
      bytes: BYTES,
      sizeBytes: 3,
    })),
  } satisfies Pick<RecipePhotoStore, "open">;

  return {
    useCase: new OpenRecipePhotoUseCase({ recipes, store }),
    recipes,
    store,
  };
}

describe("OpenRecipePhotoUseCase", () => {
  it("opens the recipe's current photo for the coach who owns it, as a WebP image", async () => {
    // arrange
    const { useCase, recipes, store } = createUseCase();

    // act
    const result = await useCase.execute({
      viewer: COACH,
      recipeId: RECIPE_ID,
      photoId: PHOTO_ID,
    });

    // assert
    expect(result).toEqual({
      status: "opened",
      mediaType: "image/webp",
      bytes: BYTES,
      sizeBytes: 3,
    });
    expect(recipes.find).toHaveBeenCalledExactlyOnceWith({
      ownerAccountId: COACH_ACCOUNT_ID,
      recipeId: RECIPE_ID,
    });
    expect(store.open).toHaveBeenCalledExactlyOnceWith(PHOTO_ID);
  });

  it("answers not found to another coach without opening the file", async () => {
    // arrange
    const { useCase, store } = createUseCase();

    // act
    const result = await useCase.execute({
      viewer: {
        kind: "coach",
        accountId: "c0000000-0000-4000-8000-000000000002",
      },
      recipeId: RECIPE_ID,
      photoId: PHOTO_ID,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(store.open).not.toHaveBeenCalled();
  });

  it.each<{ viewer: RecipePhotoViewer }>([
    { viewer: { kind: "client", authSubjectId: "user_1" } },
    { viewer: { kind: "visitor" } },
  ])(
    "answers not found to a $viewer.kind without looking for the recipe",
    async ({ viewer }) => {
      // arrange
      const { useCase, recipes, store } = createUseCase();

      // act
      const result = await useCase.execute({
        viewer,
        recipeId: RECIPE_ID,
        photoId: PHOTO_ID,
      });

      // assert
      expect(result).toEqual({ status: "not-found" });
      expect(recipes.find).not.toHaveBeenCalled();
      expect(store.open).not.toHaveBeenCalled();
    },
  );

  it("answers not found for a photo id that is no longer the recipe's photo", async () => {
    // arrange
    const { useCase, store } = createUseCase();

    // act
    const result = await useCase.execute({
      viewer: COACH,
      recipeId: RECIPE_ID,
      photoId: "7a1b0000-0000-4000-8000-000000000000",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(store.open).not.toHaveBeenCalled();
  });

  it("answers not found for a recipe without a photo", async () => {
    // arrange
    const { useCase, store } = createUseCase({ ...PORRIDGE, photo: null });

    // act
    const result = await useCase.execute({
      viewer: COACH,
      recipeId: RECIPE_ID,
      photoId: PHOTO_ID,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(store.open).not.toHaveBeenCalled();
  });

  it("answers not found for a missing recipe", async () => {
    // arrange
    const { useCase } = createUseCase(null);

    // act
    const result = await useCase.execute({
      viewer: COACH,
      recipeId: RECIPE_ID,
      photoId: PHOTO_ID,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });

  it("answers not found when the stored file has gone", async () => {
    // arrange
    const { useCase, store } = createUseCase();
    store.open.mockResolvedValueOnce({ status: "missing" });

    // act
    const result = await useCase.execute({
      viewer: COACH,
      recipeId: RECIPE_ID,
      photoId: PHOTO_ID,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });
});
