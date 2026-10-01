import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import sharp from "sharp";

import { platformDirectory } from "./repo-paths";

export type ServedPhotoReading = {
  format: string | undefined;
  width: number | undefined;
  height: number | undefined;
  carriesMetadata: boolean;
};

const JPEG_START = Buffer.from([0xff, 0xd8, 0xff]);

export async function readServedPhoto(
  bytes: Buffer,
): Promise<ServedPhotoReading> {
  const { format, width, height, exif, xmp, iptc } =
    await sharp(bytes).metadata();

  return {
    format,
    width,
    height,
    carriesMetadata: Boolean(exif ?? xmp ?? iptc),
  };
}

export function storedPhotoFilesOf(clientId: string): Buffer[] {
  const mediaRoot = process.env.CLIENT_MEDIA_ROOT;

  if (!mediaRoot) {
    throw new Error("CLIENT_MEDIA_ROOT is not set for the e2e run.");
  }

  const clientDirectory = resolve(platformDirectory, mediaRoot, clientId);

  return readdirSync(clientDirectory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => readFileSync(join(entry.parentPath, entry.name)));
}

export function isReadableJpeg(bytes: Buffer): boolean {
  return bytes.subarray(0, JPEG_START.length).equals(JPEG_START);
}
