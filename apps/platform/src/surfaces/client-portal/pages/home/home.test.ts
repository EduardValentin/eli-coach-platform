import { describe, expect, it } from "vitest";

import { meta } from "./home";

describe("client dashboard meta", () => {
  it("titles the page as the Evoa dashboard and keeps the portal's installed identity in the head", () => {
    // arrange, act
    const descriptors = meta({} as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toContainEqual({ title: "Dashboard | Evoa" });
    expect(descriptors).toContainEqual({
      name: "theme-color",
      content: "#ffffff",
    });
    expect(descriptors).toContainEqual({
      name: "description",
      content: "Your coaching home: your program, check-ins and progress.",
    });
  });
});
