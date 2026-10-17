import { describe, expect, it } from "vitest";

import {
  InvalidStoredRecipePhotoError,
  MAX_RECIPE_PHOTO_BYTES,
  RECIPE_PHOTO_MEDIA_TYPE,
  RECIPE_PHOTO_RENDITION,
  RecipePhoto,
} from "./recipe-photo";

const PHOTO_ID = "7a1b0000-0000-4000-8000-000000000001";
const OTHER_PHOTO_ID = "7a1b0000-0000-4000-8000-000000000002";

describe("RecipePhoto", () => {
  it("caps a photo at 10 MB and renders it as one WebP of 1,200 px on its long edge", () => {
    // arrange
    const tenMegabytes = 10 * 1024 * 1024;

    // act
    const intake = {
      maxBytes: MAX_RECIPE_PHOTO_BYTES,
      rendition: RECIPE_PHOTO_RENDITION,
      mediaType: RECIPE_PHOTO_MEDIA_TYPE,
    };

    // assert
    expect(intake).toEqual({
      maxBytes: tenMegabytes,
      rendition: { longEdge: 1200, format: "webp", quality: 80 },
      mediaType: "image/webp",
    });
  });

  it("is read back from its stored photo id and serves as a WebP image", () => {
    // arrange
    const stored = { photoId: PHOTO_ID };

    // act
    const photo = RecipePhoto.fromStored(stored);

    // assert
    expect(photo.photoId).toBe(PHOTO_ID);
    expect(photo.mediaType).toBe("image/webp");
    expect(photo.toSnapshot()).toEqual(stored);
  });

  it("is stored as its own photo id only", () => {
    // arrange
    const photo = RecipePhoto.fromStored({ photoId: PHOTO_ID });

    // act
    const matches = [
      photo.isStoredAs(PHOTO_ID),
      photo.isStoredAs(OTHER_PHOTO_ID),
    ];

    // assert
    expect(matches).toEqual([true, false]);
  });

  it.each(["", "   "])("refuses a stored photo whose id is %j", (photoId) => {
    // arrange
    const stored = { photoId };

    // act
    const reading = () => RecipePhoto.fromStored(stored);

    // assert
    expect(reading).toThrow(InvalidStoredRecipePhotoError);
  });

  it("hands out a copy of its snapshot, so a changed snapshot leaves it as it was", () => {
    // arrange
    const photo = RecipePhoto.fromStored({ photoId: PHOTO_ID });
    const snapshot = photo.toSnapshot();

    // act
    snapshot.photoId = OTHER_PHOTO_ID;

    // assert
    expect(photo.photoId).toBe(PHOTO_ID);
  });
});
