import { describe, expect, it } from "vitest";

import {
  PROGRESS_PHOTO_PARTS,
  progressPhotoOutcomesOf,
  receivedProgressPhotosOf,
} from "./progress-photo-parts";

describe("receivedProgressPhotosOf", () => {
  it("reads every view's file part in front, side, back order with its type, size and bytes", async () => {
    // arrange
    const form = new FormData();
    form.set(
      PROGRESS_PHOTO_PARTS.back,
      new File(["not an image"], "back.jpg", { type: "text/plain" }),
    );
    form.set(
      PROGRESS_PHOTO_PARTS.front,
      new File([new Uint8Array([255, 216, 255])], "front.jpg", {
        type: "image/jpeg",
      }),
    );

    // act
    const photos = await receivedProgressPhotosOf(form);

    // assert
    expect(photos).toEqual([
      {
        view: "front",
        mimeType: "image/jpeg",
        sizeBytes: 3,
        bytes: new Uint8Array([255, 216, 255]),
      },
      {
        view: "back",
        mimeType: "text/plain",
        sizeBytes: 12,
        bytes: new TextEncoder().encode("not an image"),
      },
    ]);
  });

  it("ignores a view sent as text and parts that name no view", async () => {
    // arrange
    const form = new FormData();
    form.set(PROGRESS_PHOTO_PARTS.side, "not a file");
    form.set(
      "top",
      new File([new Uint8Array([1])], "top.jpg", { type: "image/jpeg" }),
    );

    // act
    const photos = await receivedProgressPhotosOf(form);

    // assert
    expect(photos).toEqual([]);
  });
});

describe("progressPhotoOutcomesOf", () => {
  it("answers every view, absent where no photo was sent", () => {
    // arrange
    const outcomes = { front: "stored", back: "refused" } as const;

    // act
    const presented = progressPhotoOutcomesOf(outcomes);

    // assert
    expect(presented).toEqual({
      front: "stored",
      side: "absent",
      back: "refused",
    });
  });
});
