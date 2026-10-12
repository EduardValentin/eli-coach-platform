import { describe, expect, it } from "vitest";

import { invitationPath } from "./paths";

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
