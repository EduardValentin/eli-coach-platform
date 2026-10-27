import { MAX_RECIPE_PHOTO_BYTES } from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";

import type { RecipeProblems } from "~/bounded-contexts/programs/nutrition-library/public/recipes";

export type ChosenRecipePhoto =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "attach"; file: File; previewUrl: string };

export type RecipePhotoUpload = "idle" | "sending" | "failed";

export type RecipePhotoEntry = {
  chosen: ChosenRecipePhoto;
  problem: string | null;
};

type RecipePhotoProblem = NonNullable<RecipeProblems["photo"]>;

const MEGABYTE = 1024 * 1024;

const MAX_RECIPE_PHOTO_MEGABYTES = MAX_RECIPE_PHOTO_BYTES / MEGABYTE;

const RECIPE_PHOTO_EXTENSIONS: readonly string[] = [
  "jpg",
  "jpeg",
  "png",
  "webp",
];

const RECIPE_PHOTO_MEDIA_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const RECIPE_PHOTO_ACCEPT = [
  ...RECIPE_PHOTO_EXTENSIONS.map((extension) => `.${extension}`),
  ...RECIPE_PHOTO_MEDIA_TYPES,
].join(",");

export const KEEP_PHOTO: ChosenRecipePhoto = { kind: "keep" };

export const REMOVE_PHOTO: ChosenRecipePhoto = { kind: "remove" };

export const UNTOUCHED_PHOTO: RecipePhotoEntry = {
  chosen: KEEP_PHOTO,
  problem: null,
};

function isPhotoFile(file: File): boolean {
  const name = file.name.toLowerCase();

  return (
    RECIPE_PHOTO_MEDIA_TYPES.includes(file.type) ||
    RECIPE_PHOTO_EXTENSIONS.some((extension) => name.endsWith(`.${extension}`))
  );
}

function photoTooLargeMessage(file: File): string {
  return `${file.name} is larger than ${MAX_RECIPE_PHOTO_MEGABYTES} MB`;
}

export function browserPhotoRefusalMessage(file: File): string | null {
  if (!isPhotoFile(file)) {
    return `${file.name} is not a .jpg, .png or .webp — only JPEG, PNG and WebP photos are supported`;
  }

  if (file.size > MAX_RECIPE_PHOTO_BYTES) {
    return photoTooLargeMessage(file);
  }

  return null;
}

export function serverPhotoRefusalMessage(
  problem: RecipePhotoProblem,
  file: File,
): string {
  return problem === "too-large"
    ? photoTooLargeMessage(file)
    : `${file.name} doesn’t contain a JPEG, PNG or WebP photo.`;
}
