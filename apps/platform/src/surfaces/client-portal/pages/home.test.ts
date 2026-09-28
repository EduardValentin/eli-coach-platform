import { describe, expect, it } from "vitest";

import { meta } from "./home";

describe("client dashboard meta", () => {
  it("titles the page as the Evoa dashboard", () => {
    // arrange, act
    const descriptors = meta({} as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toEqual([{ title: "Dashboard | Evoa" }]);
  });
});
