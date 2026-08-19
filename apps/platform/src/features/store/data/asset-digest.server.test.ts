import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { ProductAssetSha256Digest } from "./asset-digest.server";

describe("ProductAssetSha256Digest", () => {
  it("produces the lowercase hex SHA-256 the catalog constraints expect", () => {
    // arrange
    const digest = new ProductAssetSha256Digest();
    const bytes = new Uint8Array(Buffer.from("a published guide"));

    // act
    const result = digest.sha256(bytes);

    // assert
    expect(result).toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("separates different content", () => {
    // arrange
    const digest = new ProductAssetSha256Digest();

    // act
    const first = digest.sha256(new Uint8Array(Buffer.from("one")));
    const second = digest.sha256(new Uint8Array(Buffer.from("two")));

    // assert
    expect(first).not.toBe(second);
  });
});
