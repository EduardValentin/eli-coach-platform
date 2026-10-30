import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createTokenGeneratorAdapter } from "./create-token-generator-adapter.server";
import { createTokenHasherAdapter } from "./create-token-hasher-adapter.server";

describe("createTokenHasherAdapter", () => {
  it("stores only the hex sha256 of the raw token, the same digest the hasher computes", () => {
    // arrange
    const tokenGeneratorPort = createTokenGeneratorAdapter();
    const tokenHasherPort = createTokenHasherAdapter();

    // act
    const token = tokenGeneratorPort.create();

    // assert
    expect(token.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(token.sha256).toBe(tokenHasherPort.sha256(token.rawToken));
    expect(token.sha256).toBe(
      createHash("sha256").update(token.rawToken).digest("hex"),
    );
  });
});
