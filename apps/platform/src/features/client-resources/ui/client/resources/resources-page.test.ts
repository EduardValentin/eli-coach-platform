import { describe, expect, it } from "vitest";

import { meta } from "./resources-page";

describe("client resources meta", () => {
  it("titles the page as her Evoa resources and keeps the portal's installed identity in the head", () => {
    // arrange, act
    const descriptors = meta({} as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toEqual([
      { title: "Resources | Evoa" },
      {
        name: "description",
        content: "Your coaching home: your program, check-ins and progress.",
      },
      { name: "theme-color", content: "#ffffff" },
    ]);
  });
});
