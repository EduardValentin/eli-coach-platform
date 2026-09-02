export const MAX_EXERCISE_VIDEO_BYTES = 50 * 1024 * 1024;
export const EXERCISE_VIDEO_MIME_TYPE = "video/mp4";
const EXERCISE_VIDEO_EXTENSION = ".mp4";
/** Brands the MP4 family registers; QuickTime's `qt  ` is deliberately absent. */
const MP4_BRANDS = [
  "isom",
  "iso2",
  "iso3",
  "iso4",
  "iso5",
  "iso6",
  "mp41",
  "mp42",
  "avc1",
  "dash",
  "M4V ",
];
const FTYP = "ftyp";
const BRAND_LENGTH = 4;
const MAX_BRAND_SCAN_BYTES = 256;

export type ExerciseVideoFormatResolution =
  | { status: "resolved" }
  | { status: "unsupported_content" };

/**
 * Decided from the bytes, never the filename or declared type: an ISO BMFF
 * file opens with an `ftyp` box naming a major brand and its compatible
 * brands, and a file belongs to the MP4 family when any of them does.
 */
export function resolveExerciseVideoFormat(
  bytes: Uint8Array,
): ExerciseVideoFormatResolution {
  if (bytes.byteLength < 12 || ascii(bytes, 4) !== FTYP) {
    return { status: "unsupported_content" };
  }

  const boxSize = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(0);
  const scanEnd = Math.min(boxSize, bytes.byteLength, MAX_BRAND_SCAN_BYTES);
  const brands = [ascii(bytes, 8)];

  for (let offset = 16; offset + BRAND_LENGTH <= scanEnd; offset += BRAND_LENGTH) {
    brands.push(ascii(bytes, offset));
  }

  return brands.some((brand) => MP4_BRANDS.includes(brand))
    ? { status: "resolved" }
    : { status: "unsupported_content" };
}

export function hasExerciseVideoExtension(filename: string): boolean {
  const lower = filename.toLowerCase();

  return (
    lower.length > EXERCISE_VIDEO_EXTENSION.length &&
    lower.endsWith(EXERCISE_VIDEO_EXTENSION)
  );
}

export function buildExerciseVideoAssetKey(sha256: string): string {
  return `exercise-videos/${sha256}${EXERCISE_VIDEO_EXTENSION}`;
}

function ascii(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + BRAND_LENGTH));
}
