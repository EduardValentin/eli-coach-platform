import { describe, expect, it, vi } from "vitest";

import type { NutritionLibraryIncidents } from "./nutrition-library-incidents";
import { RecipePhoto } from "./recipe-photo";
import { RecipePhotoCleanup } from "./recipe-photo-cleanup";
import type { RecipePhotoStore } from "./recipe-photo-store";

const PHOTO_ID = "7a1b0000-0000-4000-8000-000000000001";

function createCleanup() {
  const store = {
    remove: vi.fn(async (_photoId: string) => undefined),
  } satisfies Pick<RecipePhotoStore, "remove">;
  const incidents = {
    recipePhotoCleanupFailed: vi.fn(),
  } satisfies Pick<NutritionLibraryIncidents, "recipePhotoCleanupFailed">;
  const cleanup = new RecipePhotoCleanup({ store, incidents });

  return { cleanup, store, incidents };
}

describe("RecipePhotoCleanup.removeStored", () => {
  it("removes the stored photo file", async () => {
    // arrange
    const { cleanup, store, incidents } = createCleanup();

    // act
    await cleanup.removeStored(RecipePhoto.fromStored({ photoId: PHOTO_ID }));

    // assert
    expect(store.remove).toHaveBeenCalledExactlyOnceWith(PHOTO_ID);
    expect(incidents.recipePhotoCleanupFailed).not.toHaveBeenCalled();
  });

  it("removes nothing when there is no photo", async () => {
    // arrange
    const { cleanup, store } = createCleanup();

    // act
    await cleanup.removeStored(null);

    // assert
    expect(store.remove).not.toHaveBeenCalled();
  });

  it("reports a stored photo file it could not remove instead of failing", async () => {
    // arrange
    const failure = new Error("disk unavailable");
    const { cleanup, store, incidents } = createCleanup();
    store.remove.mockRejectedValueOnce(failure);

    // act
    const removing = cleanup.removeStored(
      RecipePhoto.fromStored({ photoId: PHOTO_ID }),
    );

    // assert
    await expect(removing).resolves.toBeUndefined();
    expect(incidents.recipePhotoCleanupFailed).toHaveBeenCalledExactlyOnceWith({
      photoId: PHOTO_ID,
      error: failure,
    });
  });
});
