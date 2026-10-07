import { createPdfCoverRenderer } from "@eli-coach-platform/infrastructure/documents/server";

/**
 * Repository tooling: the management API takes a supplied cover and
 * rasterizes nothing, so this script renders it ahead of publishing.
 */
export type RenderProductCoverCommand = {
  pdfBytes: Uint8Array;
  quality?: number;
  targetWidth?: number;
};

const DEFAULT_TARGET_WIDTH = 1200;
const DEFAULT_WEBP_QUALITY = 82;

export async function renderProductCover(
  command: RenderProductCoverCommand,
): Promise<Uint8Array> {
  const targetWidth = command.targetWidth ?? DEFAULT_TARGET_WIDTH;
  const quality = command.quality ?? DEFAULT_WEBP_QUALITY;

  assertPositiveInteger(targetWidth, "A cover width");
  assertPositiveInteger(quality, "A cover quality");

  if (quality > 100) {
    throw new Error("A cover quality may not exceed 100.");
  }

  return createPdfCoverRenderer().render(command.pdfBytes, {
    width: targetWidth,
    webpQuality: quality,
  });
}

function assertPositiveInteger(value: number, subject: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${subject} must be a positive whole number.`);
  }
}
