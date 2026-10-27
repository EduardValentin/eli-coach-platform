import { describe, expect, it } from "vitest";

import {
  DownloadTokenSha256,
  PayloadSha256Digest,
  RandomDownloadTokenGenerator,
} from "./download-token.server";

describe("store download tokens", () => {
  it("creates an independent opaque token for every grant", () => {
    // arrange
    const tokenHasher = new DownloadTokenSha256();
    const tokenGenerator = new RandomDownloadTokenGenerator();

    // act
    const token = tokenGenerator.create();
    const nextToken = tokenGenerator.create();

    // assert
    expect(token.rawToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(nextToken.rawToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(nextToken.rawToken).not.toBe(token.rawToken);
    expect(token.sha256).toBe(tokenHasher.sha256(token.rawToken));
    expect(nextToken.sha256).toBe(tokenHasher.sha256(nextToken.rawToken));
    expect(token.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("creates stable payload digests without exposing the source payload", () => {
    // arrange
    const digestGenerator = new PayloadSha256Digest();

    // act
    const firstDigest = digestGenerator.digest('{"email":"eli@example.com"}');
    const secondDigest = digestGenerator.digest('{"email":"eli@example.com"}');

    // assert
    expect(firstDigest).toBe(secondDigest);
    expect(firstDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(firstDigest).not.toContain("eli@example.com");
  });
});
