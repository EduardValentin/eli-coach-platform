import { describe, expect, it } from "vitest";

import {
  browserPhotoRefusalMessage,
  serverPhotoRefusalMessage,
} from "./recipe-photo-entry";

const MEGABYTE = 1024 * 1024;

function photoNamed(name: string, size: number, type = "image/jpeg"): File {
  const file = new File(["photo"], name, { type });
  Object.defineProperty(file, "size", { value: size });

  return file;
}

describe("the photo refusal copy", () => {
  it.each([
    { name: "bowl.jpg", size: 10 * MEGABYTE, type: "image/jpeg" },
    { name: "bowl.JPEG", size: 5, type: "" },
    { name: "bowl.png", size: 5, type: "image/png" },
    { name: "bowl", size: 5, type: "image/webp" },
  ])(
    "takes $name typed '$type' as a photo the server may judge",
    ({ name, size, type }) => {
      // arrange
      const file = photoNamed(name, size, type);

      // act
      const refusal = browserPhotoRefusalMessage(file);

      // assert
      expect(refusal).toBeNull();
    },
  );

  it("names a file that is not a JPEG, PNG or WebP photo", () => {
    // arrange
    const file = photoNamed("bowl.gif", 5, "image/gif");

    // act
    const refusal = browserPhotoRefusalMessage(file);

    // assert
    expect(refusal).toBe(
      "bowl.gif is not a .jpg, .png or .webp — only JPEG, PNG and WebP photos are supported",
    );
  });

  it("names a photo over 10 MB", () => {
    // arrange
    const file = photoNamed("bowl.png", 10 * MEGABYTE + 1, "image/png");

    // act
    const refusal = browserPhotoRefusalMessage(file);

    // assert
    expect(refusal).toBe("bowl.png is larger than 10 MB");
  });

  it.each([
    {
      problem: "unsupported" as const,
      message: "bowl.jpg doesn’t contain a JPEG, PNG or WebP photo.",
    },
    { problem: "too-large" as const, message: "bowl.jpg is larger than 10 MB" },
  ])(
    "words the server refusing the photo as $problem with the file's name",
    ({ problem, message }) => {
      // arrange
      const file = photoNamed("bowl.jpg", 5);

      // act
      const refusal = serverPhotoRefusalMessage(problem, file);

      // assert
      expect(refusal).toBe(message);
    },
  );
});
