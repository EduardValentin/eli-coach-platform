import { describe, expect, it } from "vitest";

import type { ApiKeyVerifierPort } from "~/bounded-contexts/access/accounts/domain/account";

import { InMemoryApiKeyVerifierAdapter } from "./in-memory-api-key-verifier-adapter.server";

describe("InMemoryApiKeyVerifierAdapter", () => {
  it("recognises no key", async () => {
    // arrange
    const apiKeyVerifierPort: ApiKeyVerifierPort =
      new InMemoryApiKeyVerifierAdapter();

    // act
    const holder = await apiKeyVerifierPort.verify("ak_anything");

    // assert
    expect(holder).toBeNull();
  });
});
