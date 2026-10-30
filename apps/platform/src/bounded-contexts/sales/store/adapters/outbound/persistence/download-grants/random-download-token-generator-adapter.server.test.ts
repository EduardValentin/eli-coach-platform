import { describe, expect, it } from "vitest";

import { RandomDownloadTokenGeneratorAdapter } from "./random-download-token-generator-adapter.server";
import { PayloadSha256DigestAdapter } from "./payload-sha256-digest-adapter.server";
import { DownloadTokenSha256Adapter } from "./download-token-sha256-adapter.server";

describe("store download tokens", () => {
  it("creates an independent opaque token for every grant", () => {
    // arrange
    const downloadTokenSha256Adapter = new DownloadTokenSha256Adapter();
    const randomDownloadTokenGeneratorAdapter =
      new RandomDownloadTokenGeneratorAdapter();

    // act
    const token = randomDownloadTokenGeneratorAdapter.create();
    const nextToken = randomDownloadTokenGeneratorAdapter.create();

    // assert
    expect(token.rawToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(nextToken.rawToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(nextToken.rawToken).not.toBe(token.rawToken);
    expect(token.sha256).toBe(
      downloadTokenSha256Adapter.sha256(token.rawToken),
    );
    expect(nextToken.sha256).toBe(
      downloadTokenSha256Adapter.sha256(nextToken.rawToken),
    );
    expect(token.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("creates stable payload digests without exposing the source payload", () => {
    // arrange
    const payloadSha256DigestAdapter = new PayloadSha256DigestAdapter();

    // act
    const firstDigest = payloadSha256DigestAdapter.digest(
      '{"email":"eli@example.com"}',
    );
    const secondDigest = payloadSha256DigestAdapter.digest(
      '{"email":"eli@example.com"}',
    );

    // assert
    expect(firstDigest).toBe(secondDigest);
    expect(firstDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(firstDigest).not.toContain("eli@example.com");
  });
});
