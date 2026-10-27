import { describe, expect, it } from "vitest";

import {
  coachClientIdentityPath,
  coachClientProfilePath,
  invitationPath,
} from "./paths";

describe("invitationPath", () => {
  it("carries the invitation token in the fragment so it never reaches the server", () => {
    // arrange
    const token = "abc-DEF_123";

    // act
    const path = invitationPath({ token });

    // assert
    expect(path).toBe("/invitation#abc-DEF_123");
  });
});

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
