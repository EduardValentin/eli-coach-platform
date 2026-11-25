import { describe, expect, it } from "vitest";

import { SCREEN_CARD_TITLE_CLASS, WIDGET_SUBHEADING_CLASS } from "./typography";

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

  it("sets a widget subheading in small medium-weight primary text", () => {
    // arrange
    // act
    const classes = WIDGET_SUBHEADING_CLASS.split(" ");

    // assert
    expect(classes).toEqual(["text-sm", "font-medium", "text-text-primary"]);
  });
});
