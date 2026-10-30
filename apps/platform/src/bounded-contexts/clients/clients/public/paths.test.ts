import { describe, expect, it } from "vitest";

import { coachClientIdentityPath, coachClientProfilePath } from "./paths";

describe("coach client paths", () => {
  it("places her profile page under her client page", () => {
    // arrange
    const clientId = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

    // act
    const path = coachClientProfilePath(clientId);

    // assert
    expect(path).toBe(
      "/coach/clients/4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11/profile",
    );
  });

  it("names the identity the coach edits under the clients API", () => {
    // arrange
    const clientId = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

    // act
    const path = coachClientIdentityPath(clientId);

    // assert
    expect(path).toBe(
      "/api/clients/4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11/identity",
    );
  });
});
