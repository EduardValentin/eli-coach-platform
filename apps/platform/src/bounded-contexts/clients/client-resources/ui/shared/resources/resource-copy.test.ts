import { describe, expect, it } from "vitest";

import {
  formatFileSize,
  pageCountLabel,
  possessive,
  RESOURCE_UPLOAD_HINT,
  UPLOAD_REFUSAL_MESSAGES,
} from "./resource-copy";

describe("formatFileSize", () => {
  it.each([
    { bytes: 512, size: "512 B" },
    { bytes: 1024, size: "1 KB" },
    { bytes: 96_000, size: "94 KB" },
    { bytes: 1_840_000, size: "1.8 MB" },
    { bytes: 25 * 1024 * 1024, size: "25.0 MB" },
  ])("reads $bytes bytes as $size", ({ bytes, size }) => {
    // arrange, act
    const formatted = formatFileSize(bytes);

    // assert
    expect(formatted).toBe(size);
  });
});

describe("pageCountLabel", () => {
  it("counts one page in the singular and more in the plural", () => {
    // arrange, act
    const labels = [pageCountLabel(1), pageCountLabel(6)];

    // assert
    expect(labels).toEqual(["1 page", "6 pages"]);
  });
});

describe("possessive", () => {
  it("adds a typographic apostrophe and s to her name", () => {
    // arrange, act
    const owned = possessive("Andreea");

    // assert
    expect(owned).toBe("Andreea’s");
  });
});

describe("upload copy", () => {
  it("names the limits the server enforces", () => {
    // arrange, act
    const copy = {
      hint: RESOURCE_UPLOAD_HINT,
      tooLarge: UPLOAD_REFUSAL_MESSAGES["too-large"],
      tooManyPages: UPLOAD_REFUSAL_MESSAGES["too-many-pages"],
    };

    // assert
    expect(copy).toEqual({
      hint: "PDF, Word, Excel or image · up to 25 MB",
      tooLarge: "That file is over 25 MB.",
      tooManyPages: "That PDF has more than 50 pages.",
    });
  });
});
