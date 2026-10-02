import type { ProgressPhotoView } from "@eli-coach-platform/domain/client-profile";
import sharp from "sharp";

export type SamplePhoto = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

const PHOTO_SIZE_LIMIT_BYTES = 10 * 1024 * 1024;

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

export function samplePhotoOf(view: ProgressPhotoView): SamplePhoto {
  return { name: `${view}.png`, mimeType: "image/png", buffer: ONE_PIXEL_PNG };
}

export const UNPROCESSABLE_PHOTO: SamplePhoto = {
  name: "front.jpg",
  mimeType: "image/jpeg",
  buffer: Buffer.from("A shopping list, not a photo."),
};

export const UNSUPPORTED_TYPE_PHOTO: SamplePhoto = {
  name: "side.gif",
  mimeType: "image/gif",
  buffer: Buffer.from("GIF89a"),
};

export const OVERSIZED_PHOTO: SamplePhoto = {
  name: "side.png",
  mimeType: "image/png",
  buffer: Buffer.alloc(PHOTO_SIZE_LIMIT_BYTES + 1),
};

export type CameraPhotoFormat = "jpeg" | "webp";

export const CAMERA_PHOTO_EDGES = { width: 4000, height: 3000 };

export async function cameraPhotoOf(
  view: ProgressPhotoView,
  format: CameraPhotoFormat,
  metadataMarker: string,
): Promise<SamplePhoto> {
  const photo = sharp({
    create: {
      ...CAMERA_PHOTO_EDGES,
      channels: 3,
      background: { r: 200, g: 120, b: 90 },
    },
  }).withExif({
    IFD0: { ImageDescription: metadataMarker, Copyright: metadataMarker },
  });
  const buffer =
    format === "jpeg"
      ? await photo.jpeg().toBuffer()
      : await photo.webp().toBuffer();

  return { name: `${view}.${format}`, mimeType: `image/${format}`, buffer };
}
