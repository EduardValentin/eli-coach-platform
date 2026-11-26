import { describe, expect, it } from "vitest";

import { resolveComingSoonMode } from "./config.server";

describe("resolveComingSoonMode", () => {
  it("is on for a production runtime that sets nothing, so a missing value fails closed", () => {
    // arrange
    const environment = { ENVIRONMENT: "production" };

    // act
    const mode = resolveComingSoonMode(environment);

    // assert
    expect(mode).toBe("on");
  });

  it.each(["local", "test"])("is off on %s when nothing is set", (name) => {
    // arrange
    const environment = { ENVIRONMENT: name };

    // act
    const mode = resolveComingSoonMode(environment);

    // assert
    expect(mode).toBe("off");
  });

  it("lets an explicit off win in a production runtime", () => {
    // arrange
    const environment = {
      COMING_SOON_MODE: "off" as const,
      ENVIRONMENT: "production",
    };

    // act
    const mode = resolveComingSoonMode(environment);

    // assert
    expect(mode).toBe("off");
  });

  it("lets an explicit on win on LOCAL", () => {
    // arrange
    const environment = {
      COMING_SOON_MODE: "on" as const,
      ENVIRONMENT: "local",
    };

    // act
    const mode = resolveComingSoonMode(environment);

    // assert
    expect(mode).toBe("on");
  });
});
