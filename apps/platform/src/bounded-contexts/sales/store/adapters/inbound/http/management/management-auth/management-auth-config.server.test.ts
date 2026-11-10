import { describe, expect, it } from "vitest";

import { createManagementAuthConfig } from "./management-auth-config.server";

describe("createManagementAuthConfig", () => {
  it("accepts any transport when the app is published over http", () => {
    // arrange
    const publicAppUrl = "http://localhost:3000";

    // act
    const config = createManagementAuthConfig(publicAppUrl);

    // assert
    expect(config).toEqual({ transportPolicy: "any" });
  });

  it("requires https when the app is published over https", () => {
    // arrange
    const publicAppUrl = "https://app.evoa.fitness";

    // act
    const config = createManagementAuthConfig(publicAppUrl);

    // assert
    expect(config).toEqual({ transportPolicy: "https_required" });
  });
});
