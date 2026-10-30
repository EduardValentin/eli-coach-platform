import { describe, expect, it } from "vitest";

import { createTokenGeneratorAdapter } from "./create-token-generator-adapter.server";

describe("createTokenGeneratorAdapter", () => {
  it("creates an unguessable url-safe token of at least 128 bits for every payment link and invitation", () => {
    // arrange
    const tokenGeneratorPort = createTokenGeneratorAdapter();

    // act
    const token = tokenGeneratorPort.create();
    const nextToken = tokenGeneratorPort.create();

    // assert
    expect(token.rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token.rawToken, "base64url")).toHaveLength(32);
    expect(nextToken.rawToken).not.toBe(token.rawToken);
  });
});
