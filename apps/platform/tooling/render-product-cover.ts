import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * Repository tooling, never application runtime. The management API takes a
 * supplied cover and rasterizes nothing, so `pdfjs-dist` and `@napi-rs/canvas`
 * stay development dependencies and never reach the production image.
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

  const loadingTask = getDocument({
    // Copied because pdf.js transfers the buffer to its worker and detaches it,
    // which would leave the caller holding an empty array after one render.
    data: Uint8Array.from(command.pdfBytes),
    standardFontDataUrl: resolveStandardFontDirectory(),
    useSystemFonts: true,
  });

  try {
    const document = await loadingTask.promise;
    const page = await document.getPage(1);
    const viewport = page.getViewport({
      scale: targetWidth / page.getViewport({ scale: 1 }).width,
    });
    const canvas = createCanvas(
      Math.round(viewport.width),
      Math.round(viewport.height),
    );
    const context = canvas.getContext("2d");

    // Pages may be transparent; the catalog renders covers on an opaque card.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      // pdf.js renders through the context only when `canvas` is explicitly
      // null; this canvas is a native one rather than a DOM element.
      canvas: null,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    return new Uint8Array(await canvas.encode("webp", quality));
  } finally {
    await loadingTask.destroy();
  }
}

/**
 * Resolved through the package specifier rather than a literal node_modules
 * path, so it keeps working under pnpm's nested store layout.
 */
function resolveStandardFontDirectory(): string {
  return new URL(
    "../../standard_fonts/",
    import.meta.resolve("pdfjs-dist/legacy/build/pdf.mjs"),
  ).href;
}

function assertPositiveInteger(value: number, subject: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${subject} must be a positive whole number.`);
  }
}
