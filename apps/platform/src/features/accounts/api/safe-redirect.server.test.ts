import { describe, expect, it } from "vitest";

import { resolveSafeRedirectPath, STORE_PATH } from "./safe-redirect.server";

describe("resolveSafeRedirectPath", () => {
  it.each([
    ["/store", "/store"],
    ["/coach", "/coach"],
    ["/store/some-product?variant=2", "/store/some-product?variant=2"],
    ["/store#top", "/store#top"],
  ])("keeps the same-origin path %s", (candidate, expected) => {
    // arrange
    // act
    const resolved = resolveSafeRedirectPath(candidate);

    // assert
    expect(resolved).toBe(expected);
  });

  it.each([
    ["an absolute URL", "https://evil.example/steal"],
    ["a protocol-relative URL", "//evil.example/steal"],
    ["a backslash-disguised host", "/\\evil.example"],
    ["a scheme-relative path", "https:/evil.example"],
    ["a javascript scheme", "javascript:alert(1)"],
    ["a bare word", "store"],
    ["an empty value", ""],
    ["a missing value", null],
    ["a newline-smuggled header", "/store\nSet-Cookie: a=b"],
    ["a tab-smuggled value", "/store\tmore"],
  ])("falls back to the Store for %s", (_description, candidate) => {
    // arrange
    // act
    const resolved = resolveSafeRedirectPath(candidate);

    // assert
    expect(resolved).toBe(STORE_PATH);
  });
});
