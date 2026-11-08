import { describe, expect, it } from "vitest";

import { meta } from "./catalog-page";

describe("store catalog metadata", () => {
  it("names the page after the whole store, plans and free guides alike", () => {
    // arrange
    const args = {} as Parameters<typeof meta>[0];

    // act
    const metadata = meta(args);

    // assert
    expect(metadata).toEqual([
      { title: "Store | Evoa" },
      {
        content:
          "Workout and nutrition plans, plus free guides to get you started.",
        name: "description",
      },
    ]);
  });
});
