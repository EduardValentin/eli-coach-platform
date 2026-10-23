export const MAX_RECIPE_PHOTO_BYTES = 10 * 1024 * 1024;

export type RecipePhotoRenditionSpec = {
  longEdge: number;
  format: "webp";
  quality: number;
};

export const RECIPE_PHOTO_RENDITION: RecipePhotoRenditionSpec = {
  longEdge: 1200,
  format: "webp",
  quality: 80,
};

export const RECIPE_PHOTO_MEDIA_TYPE = `image/${RECIPE_PHOTO_RENDITION.format}`;

export type RecipePhotoRefusal = "unsupported" | "too-large";

export type RecipePhotoSnapshot = { photoId: string };

export class InvalidStoredRecipePhotoError extends Error {
  constructor() {
    super("A stored recipe photo has no photo id.");
    this.name = "InvalidStoredRecipePhotoError";
  }
}

export class RecipePhoto {
  private constructor(private readonly snapshot: RecipePhotoSnapshot) {}

  static fromStored(stored: RecipePhotoSnapshot): RecipePhoto {
    if (stored.photoId.trim().length === 0) {
      throw new InvalidStoredRecipePhotoError();
    }

    return new RecipePhoto({ photoId: stored.photoId });
  }

  get photoId(): string {
    return this.snapshot.photoId;
  }

  get mediaType(): string {
    return RECIPE_PHOTO_MEDIA_TYPE;
  }

  isStoredAs(photoId: string): boolean {
    return this.snapshot.photoId === photoId;
  }

  toSnapshot(): RecipePhotoSnapshot {
    return { ...this.snapshot };
  }
}

export type RecipePhotoChoice =
  { kind: "keep" } | { kind: "remove" } | { kind: "attach"; bytes: Uint8Array };

export type RecipePhotoChange =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "attach"; photo: RecipePhoto };
