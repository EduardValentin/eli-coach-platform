import { describe, expect, it } from "vitest";

import { SCREEN_CARD_TITLE_CLASS } from "./typography";

describe("typography classes", () => {
  it("sets a screen card title in the regular heading face", () => {
    // arrange
    // act
    const classes = SCREEN_CARD_TITLE_CLASS.split(" ");

    // assert
    expect(classes).toEqual([
      "font-heading",
      "text-lg",
      "font-normal",
      "text-text-primary",
    ]);
  });
});
