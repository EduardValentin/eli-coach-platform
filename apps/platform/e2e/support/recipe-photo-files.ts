import { existsSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import { MAX_RECIPE_PHOTO_BYTES } from "@eli-coach-platform/domain/nutrition";
import sharp from "sharp";

import { platformDirectory } from "./repo-paths";
import type { SamplePhoto } from "./sample-photos";

const RECIPE_PHOTO_METADATA_MARKER = "evoa-recipe-photo-e2e";

const CAMERA_PHOTO = { width: 4000, height: 3000 };

const SCREENSHOT_PHOTO = { width: 1600, height: 900 };

function recipePhotoRoot(): string | undefined {
  const photoRoot = process.env.RECIPE_PHOTO_ROOT;

  return photoRoot && resolve(platformDirectory, photoRoot);
}

export function storedRecipePhotoIds(): string[] {
  const photoRoot = recipePhotoRoot();

  if (!photoRoot) {
    throw new Error("RECIPE_PHOTO_ROOT is not set for the e2e run.");
  }

  const photos = resolve(photoRoot, "photos");

  return existsSync(photos) ? readdirSync(photos) : [];
}

export function removeRecipePhotoFiles(
  photoIds: readonly string[],
  logPrefix: string,
): void {
  const photoRoot = recipePhotoRoot();

  if (!photoRoot) {
    console.log(
      `${logPrefix} Recipe photos: skipped, RECIPE_PHOTO_ROOT is not set`,
    );

    return;
  }

  const stored = photoIds
    .map((photoId) => resolve(photoRoot, "photos", photoId))
    .filter((path) => existsSync(path));

  for (const path of stored) {
    rmSync(path);
  }

  console.log(`${logPrefix} Recipe photos: removed ${stored.length}`);
}

export class RecipePhotoSamples {
  async cameraJpeg(): Promise<SamplePhoto> {
    const buffer = await sharp({
      create: {
        ...CAMERA_PHOTO,
        channels: 3,
        background: { r: 214, g: 160, b: 92 },
      },
    })
      .withExif({
        IFD0: {
          ImageDescription: RECIPE_PHOTO_METADATA_MARKER,
          Copyright: RECIPE_PHOTO_METADATA_MARKER,
        },
      })
      .jpeg()
      .toBuffer();

    return { name: "chicken-rice-bowl.jpg", mimeType: "image/jpeg", buffer };
  }

  async screenshotPng(): Promise<SamplePhoto> {
    const buffer = await sharp({
      create: {
        ...SCREENSHOT_PHOTO,
        channels: 3,
        background: { r: 96, g: 140, b: 110 },
      },
    })
      .png()
      .toBuffer();

    return { name: "salmon-sweet-potato.png", mimeType: "image/png", buffer };
  }

  textNamedAsPhoto(): SamplePhoto {
    return {
      name: "bowl-notes.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("Rice, chicken, a squeeze of lime.\n"),
    };
  }

  notAPhoto(): SamplePhoto {
    return {
      name: "bowl.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("GIF89a"),
    };
  }

  overTheCap(): SamplePhoto {
    return {
      name: "bowl-large.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(MAX_RECIPE_PHOTO_BYTES + 1),
    };
  }
}
