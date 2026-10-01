import type { ProgressPhotoView } from "@eli-coach-platform/domain/client-profile";

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
