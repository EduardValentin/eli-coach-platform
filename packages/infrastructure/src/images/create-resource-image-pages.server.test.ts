import { crc32 } from "node:zlib";

import {
  RESOURCE_RENDITIONS,
  type ResourceImageRendering,
} from "@eli-coach-platform/domain/client-resources";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { createResourceImagePages } from "./create-resource-image-pages.server";

const PNG_IHDR_WIDTH_OFFSET = 16;
const PNG_IHDR_HEIGHT_OFFSET = 20;
const PNG_IHDR_TYPE_OFFSET = 12;
const PNG_IHDR_CRC_OFFSET = 29;

function solidImage(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: "#336699" },
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

function renderedPages(rendering: ResourceImageRendering) {
  if (rendering.status !== "rendered") {
    throw new Error("Expected the image to be rendered.");
  }

  return rendering;
}

async function dimensionsAndFormat(bytes: Uint8Array) {
  const { width, height, format } = await sharp(bytes).metadata();

  return { width, height, format };
}

async function pngDeclaringDimensions(
  width: number,
  height: number,
): Promise<Uint8Array> {
  const png = Buffer.from(await solidImage(8, 8).png().toBuffer());

  png.writeUInt32BE(width, PNG_IHDR_WIDTH_OFFSET);
  png.writeUInt32BE(height, PNG_IHDR_HEIGHT_OFFSET);
  png.writeUInt32BE(
    crc32(png.subarray(PNG_IHDR_TYPE_OFFSET, PNG_IHDR_CRC_OFFSET)),
    PNG_IHDR_CRC_OFFSET,
  );

  return png;
}

async function truncated(image: Promise<Buffer>): Promise<Uint8Array> {
  const bytes = await image;

  return bytes.subarray(0, Math.floor(bytes.length / 2));
}

describe("createResourceImagePages", () => {
  it.each([
    ["JPEG", () => solidImage(4000, 3000).jpeg().toBuffer()],
    ["PNG", () => solidImage(4000, 3000).png().toBuffer()],
    ["WebP", () => solidImage(4000, 3000).webp().toBuffer()],
  ])(
    "renders a large %s as a WebP page and thumbnail bounded on their long edge",
    async (_format, createImage) => {
      // arrange
      const image = await createImage();

      // act
      const rendering =
        await createResourceImagePages(RESOURCE_RENDITIONS).render(image);

      // assert
      const { page, thumbnail } = renderedPages(rendering);
      expect(await dimensionsAndFormat(page)).toEqual({
        width: 1600,
        height: 1200,
        format: "webp",
      });
      expect(await dimensionsAndFormat(thumbnail)).toEqual({
        width: 480,
        height: 360,
        format: "webp",
      });
    },
  );

  it("bounds a portrait image on its height", async () => {
    // arrange
    const portrait = await solidImage(3000, 4000).png().toBuffer();

    // act
    const rendering =
      await createResourceImagePages(RESOURCE_RENDITIONS).render(portrait);

    // assert
    const { page, thumbnail } = renderedPages(rendering);
    expect(await dimensionsAndFormat(page)).toMatchObject({
      width: 1200,
      height: 1600,
    });
    expect(await dimensionsAndFormat(thumbnail)).toMatchObject({
      width: 360,
      height: 480,
    });
  });

  it("takes its bounds from the renditions it is given", async () => {
    // arrange
    const image = await solidImage(400, 200).png().toBuffer();
    const renditions = {
      page: { longEdge: 100 },
      thumbnail: { longEdge: 50 },
      format: "webp" as const,
      quality: 80,
    };

    // act
    const rendering = await createResourceImagePages(renditions).render(image);

    // assert
    const { page, thumbnail } = renderedPages(rendering);
    expect(await dimensionsAndFormat(page)).toMatchObject({
      width: 100,
      height: 50,
    });
    expect(await dimensionsAndFormat(thumbnail)).toMatchObject({
      width: 50,
      height: 25,
    });
  });

  it("encodes at the quality of the renditions it is given", async () => {
    // arrange
    const image = await noisyImage(400, 300).png().toBuffer();
    const renderAt = async (quality: number) =>
      renderedPages(
        await createResourceImagePages({
          ...RESOURCE_RENDITIONS,
          quality,
        }).render(image),
      );

    // act
    const [rough, fine] = await Promise.all([renderAt(10), renderAt(100)]);

    // assert
    expect(rough.page.byteLength).toBeLessThan(fine.page.byteLength);
    expect(rough.thumbnail.byteLength).toBeLessThan(fine.thumbnail.byteLength);
  });

  it("never enlarges an image smaller than the bounds", async () => {
    // arrange
    const smallImage = await solidImage(300, 150).jpeg().toBuffer();

    // act
    const rendering =
      await createResourceImagePages(RESOURCE_RENDITIONS).render(smallImage);

    // assert
    const { page, thumbnail } = renderedPages(rendering);
    expect(await dimensionsAndFormat(page)).toMatchObject({
      width: 300,
      height: 150,
    });
    expect(await dimensionsAndFormat(thumbnail)).toMatchObject({
      width: 300,
      height: 150,
    });
  });

  it("turns an image upright from its orientation tag and keeps none of its metadata", async () => {
    // arrange
    const sidewaysImageWithLocation = await solidImage(40, 20)
      .jpeg()
      .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "51/1 30/1 0/1" } })
      .withMetadata({ orientation: 6 })
      .toBuffer();

    // act
    const rendering = await createResourceImagePages(
      RESOURCE_RENDITIONS,
    ).render(sidewaysImageWithLocation);

    // assert
    const { page, thumbnail } = renderedPages(rendering);
    for (const rendition of [page, thumbnail]) {
      const metadata = await sharp(rendition).metadata();
      expect([metadata.width, metadata.height]).toEqual([20, 40]);
      expect(metadata.exif).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
      expect(metadata.orientation).toBeUndefined();
    }
  });

  it.each([
    ["a GIF", () => solidImage(10, 10).gif().toBuffer()],
    ["an AVIF", () => solidImage(10, 10).avif().toBuffer()],
    [
      "a text file",
      async () => new TextEncoder().encode("not an image at all"),
    ],
    [
      "a truncated JPEG",
      () => truncated(noisyImage(200, 200).jpeg().toBuffer()),
    ],
    ["a truncated PNG", () => truncated(noisyImage(200, 200).png().toBuffer())],
    [
      "an image declaring too many pixels",
      () => pngDeclaringDimensions(20_000, 20_000),
    ],
  ])("refuses %s", async (_input, createInput) => {
    // arrange
    const input = await createInput();

    // act
    const rendering =
      await createResourceImagePages(RESOURCE_RENDITIONS).render(input);

    // assert
    expect(rendering).toEqual({ status: "refused" });
  });
});
