import { loadImage } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";

import { renderProductCover } from "./render-product-cover";

/**
 * Built inline rather than committed, so the suite carries no binary fixture.
 * One page, one stroked rectangle, 200x400 points — enough to prove the page is
 * rasterized at the requested width and encoded as WebP.
 */
const SINGLE_PAGE_PDF = new TextEncoder().encode(
  [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 400]/Contents 4 0 R/Resources<<>>>>endobj",
    "4 0 obj<</Length 30>>stream",
    "1 0 0 RG 10 10 100 100 re S",
    "endstream",
    "endobj",
    "trailer<</Root 1 0 R/Size 5>>",
    "%%EOF",
    "",
  ].join("\n"),
);

describe("renderProductCover", () => {
  it("rasterizes the first page as WebP at the requested width", async () => {
    // arrange
    // act
    const cover = await renderProductCover({
      pdfBytes: SINGLE_PAGE_PDF,
      targetWidth: 300,
    });
    const decoded = await loadImage(Buffer.from(cover));

    // assert
    expect(Buffer.from(cover.subarray(0, 4)).toString("ascii")).toBe("RIFF");
    expect(Buffer.from(cover.subarray(8, 12)).toString("ascii")).toBe("WEBP");
    expect(decoded.width).toBe(300);
    expect(decoded.height).toBe(600);
  });

  it("defaults to a catalog-sized cover", async () => {
    // arrange
    // act
    const cover = await renderProductCover({ pdfBytes: SINGLE_PAGE_PDF });
    const decoded = await loadImage(Buffer.from(cover));

    // assert
    expect(decoded.width).toBe(1200);
  });

  it.each([
    ["a fractional width", { targetWidth: 12.5 }],
    ["a zero width", { targetWidth: 0 }],
    ["a negative width", { targetWidth: -100 }],
  ])("rejects %s", async (_description, overrides) => {
    // arrange
    // act
    const rendering = renderProductCover({
      pdfBytes: SINGLE_PAGE_PDF,
      ...overrides,
    });

    // assert
    await expect(rendering).rejects.toThrow(
      "A cover width must be a positive whole number.",
    );
  });

  it("rejects a quality above the encoder's range", async () => {
    // arrange
    // act
    const rendering = renderProductCover({
      pdfBytes: SINGLE_PAGE_PDF,
      quality: 101,
    });

    // assert
    await expect(rendering).rejects.toThrow(
      "A cover quality may not exceed 100.",
    );
  });
});
