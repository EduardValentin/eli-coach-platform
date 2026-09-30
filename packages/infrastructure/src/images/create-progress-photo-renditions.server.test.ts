import { crc32 } from "node:zlib";

import type { ProgressPhotoRendition } from "@eli-coach-platform/domain/client-profile";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { createProgressPhotoRenditions } from "./create-progress-photo-renditions.server";

const JPEG_START_OF_IMAGE = [0xff, 0xd8];
const PNG_IHDR_WIDTH_OFFSET = 16;
const PNG_IHDR_HEIGHT_OFFSET = 20;
const PNG_IHDR_TYPE_OFFSET = 12;
const PNG_IHDR_CRC_OFFSET = 29;

function solidImage(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: "#336699" },
  });
}

function renditionBytes(rendition: ProgressPhotoRendition): Uint8Array {
  if (rendition.status !== "rendered") {
    throw new Error("Expected the photo to be rendered.");
  }

  return rendition.bytes;
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

describe("createProgressPhotoRenditions", () => {
  it("renders a JPEG that carries no metadata and is turned upright from its orientation tag", async () => {
    // arrange
    const sidewaysPhotoWithLocation = await solidImage(40, 20)
      .jpeg()
      .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "51/1 30/1 0/1" } })
      .withMetadata({ orientation: 6 })
      .toBuffer();

    // act
    const rendition = await createProgressPhotoRenditions().render(
      sidewaysPhotoWithLocation,
    );

    // assert
    expect(rendition).toMatchObject({
      status: "rendered",
      mimeType: "image/jpeg",
    });
    const metadata = await sharp(renditionBytes(rendition)).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
    expect([metadata.width, metadata.height]).toEqual([20, 40]);
  });

  it("bounds a large PNG to 1600 px on its longest edge", async () => {
    // arrange
    const largePhoto = await solidImage(4000, 3000).png().toBuffer();

    // act
    const rendition = await createProgressPhotoRenditions().render(largePhoto);

    // assert
    const metadata = await sharp(renditionBytes(rendition)).metadata();
    expect(metadata.format).toBe("jpeg");
    expect([metadata.width, metadata.height]).toEqual([1600, 1200]);
  });

  it("renders a WebP as a JPEG", async () => {
    // arrange
    const webpPhoto = await solidImage(30, 30).webp().toBuffer();

    // act
    const rendition = await createProgressPhotoRenditions().render(webpPhoto);

    // assert
    const rendered = renditionBytes(rendition);
    expect([...rendered.subarray(0, 2)]).toEqual(JPEG_START_OF_IMAGE);
    expect((await sharp(rendered).metadata()).width).toBe(30);
  });

  it("refuses a text file", async () => {
    // arrange
    const textFile = new TextEncoder().encode("not a photo at all");

    // act
    const rendition = await createProgressPhotoRenditions().render(textFile);

    // assert
    expect(rendition).toEqual({ status: "refused" });
  });

  it("refuses an image declaring more pixels than the input limit", async () => {
    // arrange
    const oversizedPhoto = await pngDeclaringDimensions(20_000, 20_000);

    // act
    const rendition =
      await createProgressPhotoRenditions().render(oversizedPhoto);

    // assert
    expect(rendition).toEqual({ status: "refused" });
  });

  it.each([
    ["GIF", () => solidImage(10, 10).gif().toBuffer()],
    ["TIFF", () => solidImage(10, 10).tiff().toBuffer()],
    [
      "SVG",
      async () =>
        new TextEncoder().encode(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
        ),
    ],
  ])(
    "refuses a decodable %s because only JPEG, PNG and WebP are accepted",
    async (_format, createPhoto) => {
      // arrange
      const photo = await createPhoto();

      // act
      const rendition = await createProgressPhotoRenditions().render(photo);

      // assert
      expect(rendition).toEqual({ status: "refused" });
    },
  );
});
