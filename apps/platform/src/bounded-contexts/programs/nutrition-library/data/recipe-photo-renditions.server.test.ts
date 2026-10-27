import {
  RECIPE_PHOTO_RENDITION,
  type RecipePhotoRendition,
} from "@eli-coach-platform/domain/nutrition";
import sharp, { type Sharp } from "sharp";
import { describe, expect, it } from "vitest";

import { createRecipePhotoRenditions } from "./recipe-photo-renditions.server";

function solidImage(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: "#cc7744" },
  });
}

function noisyImage(width: number, height: number) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#000000",
      noise: { type: "gaussian", mean: 128, sigma: 30 },
    },
  });
}

function withLocation(image: Sharp) {
  return image
    .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "51/1 30/1 0/1" } })
    .withMetadata({ orientation: 6 });
}

function renderedBytes(rendition: RecipePhotoRendition): Uint8Array {
  if (rendition.status !== "rendered") {
    throw new Error("Expected the photo to be rendered.");
  }

  return rendition.bytes;
}

async function truncated(image: Promise<Buffer>): Promise<Uint8Array> {
  const bytes = await image;

  return bytes.subarray(0, Math.floor(bytes.length / 2));
}

describe("createRecipePhotoRenditions", () => {
  it.each([
    ["JPEG", () => withLocation(solidImage(3000, 2000).jpeg()).toBuffer()],
    ["PNG", () => withLocation(solidImage(3000, 2000).png()).toBuffer()],
    ["WebP", () => withLocation(solidImage(3000, 2000).webp()).toBuffer()],
  ])(
    "renders a sideways %s upright as a WebP of 1,200 px on its long edge with none of its metadata",
    async (_format, createPhoto) => {
      // arrange
      const photo = await createPhoto();

      // act
      const rendition = await createRecipePhotoRenditions(
        RECIPE_PHOTO_RENDITION,
      ).render(photo);

      // assert
      const metadata = await sharp(renderedBytes(rendition)).metadata();
      expect({
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
      }).toEqual({ format: "webp", width: 800, height: 1200 });
      expect(metadata.exif).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
      expect(metadata.orientation).toBeUndefined();
    },
  );

  it("never enlarges a photo smaller than the long edge", async () => {
    // arrange
    const photo = await solidImage(300, 150).jpeg().toBuffer();

    // act
    const rendition = await createRecipePhotoRenditions(
      RECIPE_PHOTO_RENDITION,
    ).render(photo);

    // assert
    const metadata = await sharp(renderedBytes(rendition)).metadata();
    expect([metadata.width, metadata.height]).toEqual([300, 150]);
  });

  it("takes its long edge and quality from the rendition it is given", async () => {
    // arrange
    const photo = await noisyImage(400, 200).png().toBuffer();
    const renderAt = async (quality: number) =>
      renderedBytes(
        await createRecipePhotoRenditions({
          longEdge: 100,
          format: "webp",
          quality,
        }).render(photo),
      );

    // act
    const [rough, fine] = await Promise.all([renderAt(10), renderAt(100)]);

    // assert
    const metadata = await sharp(rough).metadata();
    expect([metadata.width, metadata.height]).toEqual([100, 50]);
    expect(rough.byteLength).toBeLessThan(fine.byteLength);
  });

  it.each([
    ["a GIF", () => solidImage(10, 10).gif().toBuffer()],
    ["a text file", async () => new TextEncoder().encode("not a photo at all")],
    [
      "a truncated JPEG",
      () => truncated(noisyImage(200, 200).jpeg().toBuffer()),
    ],
  ])("refuses %s", async (_input, createInput) => {
    // arrange
    const input = await createInput();

    // act
    const rendition = await createRecipePhotoRenditions(
      RECIPE_PHOTO_RENDITION,
    ).render(input);

    // assert
    expect(rendition).toEqual({ status: "refused" });
  });
});
