import { describe, expect, it } from "vitest";

import { meta } from "./profile-page";

describe("client profile meta", () => {
  it("titles the page as her Evoa profile and keeps the portal's installed identity in the head", () => {
    // arrange, act
    const descriptors = meta({} as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toEqual([
      { title: "Profile | Evoa" },
      {
        name: "description",
        content: "Your coaching home: your program, check-ins and progress.",
      },
      { name: "theme-color", content: "#ffffff" },
    ]);
  });
});
