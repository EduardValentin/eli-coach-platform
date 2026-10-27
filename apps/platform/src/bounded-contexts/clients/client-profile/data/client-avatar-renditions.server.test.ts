import type { ClientAvatarRendition } from "@eli-coach-platform/domain/client-profile";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { createClientAvatarRenditions } from "./client-avatar-renditions.server";

function solidImage(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: "#336699" },
  });
}

function renditionBytes(rendition: ClientAvatarRendition): Uint8Array {
  if (rendition.status !== "rendered") {
    throw new Error("Expected the avatar to be rendered.");
  }

  return rendition.bytes;
}

describe("createClientAvatarRenditions", () => {
  it("crops a landscape photo to a 512 px square JPEG", async () => {
    // arrange
    const landscape = await solidImage(1600, 900).png().toBuffer();

    // act
    const rendition = await createClientAvatarRenditions().render(landscape);

    // assert
    expect(rendition).toMatchObject({
      status: "rendered",
      mimeType: "image/jpeg",
    });
    const metadata = await sharp(renditionBytes(rendition)).metadata();
    expect(metadata.format).toBe("jpeg");
    expect([metadata.width, metadata.height]).toEqual([512, 512]);
  });

  it("turns a photo upright from its orientation tag and drops its metadata", async () => {
    // arrange
    const sidewaysWithLocation = await solidImage(800, 600)
      .jpeg()
      .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "51/1 30/1 0/1" } })
      .withMetadata({ orientation: 6 })
      .toBuffer();

    // act
    const rendition =
      await createClientAvatarRenditions().render(sidewaysWithLocation);

    // assert
    const metadata = await sharp(renditionBytes(rendition)).metadata();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
  });

  it("keeps a small photo square without enlarging it", async () => {
    // arrange
    const small = await solidImage(200, 100).webp().toBuffer();

    // act
    const rendition = await createClientAvatarRenditions().render(small);

    // assert
    const metadata = await sharp(renditionBytes(rendition)).metadata();
    expect([metadata.width, metadata.height]).toEqual([100, 100]);
  });

  it.each([
    ["a text file", async () => new TextEncoder().encode("not a photo")],
    ["a GIF", () => solidImage(10, 10).gif().toBuffer()],
  ])("refuses %s", async (_label, createFile) => {
    // arrange
    const file = await createFile();

    // act
    const rendition = await createClientAvatarRenditions().render(file);

    // assert
    expect(rendition).toEqual({ status: "refused" });
  });
});
