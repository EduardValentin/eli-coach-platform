import { describe, expect, it, vi } from "vitest";

import type { NutritionLibraryIncidentsPort } from "./nutrition-library-incidents-port";
import {
  MAX_RECIPE_PHOTO_BYTES,
  RecipePhoto,
  type RecipePhotoChange,
} from "./recipe-photo";
import type { RecipePhotoRendition } from "./recipe-photo-renditions-port";
import { RecipePhotoSaving } from "./recipe-photo-saving";
import type { RecipePhotoStorePort } from "./recipe-photo-store-port";

const PHOTO_ID = "7a1b0000-0000-4000-8000-000000000001";
const RECEIVED = new Uint8Array([0xff, 0xd8, 0xff]);
const RENDERED = new Uint8Array([0x52, 0x49, 0x46, 0x46]);

function createSaving() {
  const renditions = {
    render: vi.fn(
      async (_bytes: Uint8Array): Promise<RecipePhotoRendition> => ({
        status: "rendered",
        bytes: RENDERED,
      }),
    ),
  };
  const ids = { generate: vi.fn(() => PHOTO_ID) };
  const store = {
    store: vi.fn(async (_photoId: string, _bytes: Uint8Array) => undefined),
    remove: vi.fn(async (_photoId: string) => undefined),
  } satisfies Pick<RecipePhotoStorePort, "store" | "remove">;
  const incidents = {
    recipePhotoCleanupFailed: vi.fn(),
  } satisfies Pick<NutritionLibraryIncidentsPort, "recipePhotoCleanupFailed">;
  const saving = new RecipePhotoSaving({
    recipePhotoRenditionsPort: renditions,
    recipePhotoIdsPort: ids,
    recipePhotoStorePort: store,
    nutritionLibraryIncidentsPort: incidents,
  });

  return { saving, renditions, ids, store, incidents };
}

function attached(): RecipePhotoChange {
  return {
    kind: "attach",
    photo: RecipePhoto.fromStored({ photoId: PHOTO_ID }),
  };
}

describe("RecipePhotoSaving.judged", () => {
  it.each([{ kind: "keep" } as const, { kind: "remove" } as const])(
    "passes a $kind choice through without rendering",
    async (choice) => {
      // arrange
      const { saving, renditions } = createSaving();

      // act
      const judged = await saving.judged(choice);

      // assert
      expect(judged).toEqual(choice);
      expect(renditions.render).not.toHaveBeenCalled();
    },
  );

  it("renders an attached photo and keeps the rendition, never the original", async () => {
    // arrange
    const { saving, renditions } = createSaving();

    // act
    const judged = await saving.judged({ kind: "attach", bytes: RECEIVED });

    // assert
    expect(judged).toEqual({ kind: "attach", bytes: RENDERED });
    expect(renditions.render).toHaveBeenCalledExactlyOnceWith(RECEIVED);
  });

  it("accepts a photo of exactly 10 MB", async () => {
    // arrange
    const { saving } = createSaving();
    const bytes = new Uint8Array(MAX_RECIPE_PHOTO_BYTES);

    // act
    const judged = await saving.judged({ kind: "attach", bytes });

    // assert
    expect(judged.kind).toBe("attach");
  });

  it("refuses a photo over 10 MB as too large without rendering it", async () => {
    // arrange
    const { saving, renditions } = createSaving();
    const bytes = new Uint8Array(MAX_RECIPE_PHOTO_BYTES + 1);

    // act
    const judged = await saving.judged({ kind: "attach", bytes });

    // assert
    expect(judged).toEqual({ kind: "refused", refusal: "too-large" });
    expect(renditions.render).not.toHaveBeenCalled();
  });

  it("refuses a photo the renderer cannot read as unsupported", async () => {
    // arrange
    const { saving, renditions } = createSaving();
    renditions.render.mockResolvedValueOnce({ status: "refused" });

    // act
    const judged = await saving.judged({ kind: "attach", bytes: RECEIVED });

    // assert
    expect(judged).toEqual({ kind: "refused", refusal: "unsupported" });
  });
});

describe("RecipePhotoSaving.storeAccepted", () => {
  it("stores the rendition under a new photo id and answers the photo to attach", async () => {
    // arrange
    const { saving, store } = createSaving();

    // act
    const change = await saving.storeAccepted({
      kind: "attach",
      bytes: RENDERED,
    });

    // assert
    expect(change).toEqual(attached());
    expect(store.store).toHaveBeenCalledExactlyOnceWith(PHOTO_ID, RENDERED);
  });

  it.each([{ kind: "keep" } as const, { kind: "remove" } as const])(
    "stores nothing for a $kind choice",
    async (choice) => {
      // arrange
      const { saving, store, ids } = createSaving();

      // act
      const change = await saving.storeAccepted(choice);

      // assert
      expect(change).toEqual(choice);
      expect(store.store).not.toHaveBeenCalled();
      expect(ids.generate).not.toHaveBeenCalled();
    },
  );
});

describe("RecipePhotoSaving.writeOrRemoveStored", () => {
  it("keeps the new photo file when the write succeeds", async () => {
    // arrange
    const { saving, store } = createSaving();

    // act
    const outcome = await saving.writeOrRemoveStored(
      attached(),
      async () => "added",
    );

    // assert
    expect(outcome).toBe("added");
    expect(store.remove).not.toHaveBeenCalled();
  });

  it("removes the new photo file when the write finds the name taken", async () => {
    // arrange
    const { saving, store } = createSaving();

    // act
    const outcome = await saving.writeOrRemoveStored(
      attached(),
      async () => "name-taken",
    );

    // assert
    expect(outcome).toBe("name-taken");
    expect(store.remove).toHaveBeenCalledExactlyOnceWith(PHOTO_ID);
  });

  it("removes the new photo file and rethrows when the write fails", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { saving, store } = createSaving();

    // act
    const writing = saving.writeOrRemoveStored(attached(), async () => {
      throw failure;
    });

    // assert
    await expect(writing).rejects.toBe(failure);
    expect(store.remove).toHaveBeenCalledExactlyOnceWith(PHOTO_ID);
  });

  it("removes nothing for a write without a new photo", async () => {
    // arrange
    const { saving, store } = createSaving();

    // act
    await saving.writeOrRemoveStored(
      { kind: "remove" },
      async () => "name-taken",
    );

    // assert
    expect(store.remove).not.toHaveBeenCalled();
  });
});

describe("RecipePhotoSaving.removeStored", () => {
  it("removes the stored photo file", async () => {
    // arrange
    const { saving, store, incidents } = createSaving();

    // act
    await saving.removeStored(RecipePhoto.fromStored({ photoId: PHOTO_ID }));

    // assert
    expect(store.remove).toHaveBeenCalledExactlyOnceWith(PHOTO_ID);
    expect(incidents.recipePhotoCleanupFailed).not.toHaveBeenCalled();
  });

  it("removes nothing when there is no photo", async () => {
    // arrange
    const { saving, store } = createSaving();

    // act
    await saving.removeStored(null);

    // assert
    expect(store.remove).not.toHaveBeenCalled();
  });

  it("reports a stored photo file it could not remove instead of failing", async () => {
    // arrange
    const failure = new Error("disk unavailable");
    const { saving, store, incidents } = createSaving();
    store.remove.mockRejectedValueOnce(failure);

    // act
    const removing = saving.removeStored(
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
