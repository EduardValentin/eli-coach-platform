import { describe, expect, it } from "vitest";

import type { ProductAsset } from "@eli-coach-platform/domain/store";

import {
  isConfinedAsset,
  isPathWithinRoot,
  matchesAssetDigest,
  matchesAssetIdentity,
} from "./asset-confinement.server";

describe("isPathWithinRoot", () => {
  it("rejects a candidate outside the root", () => {
    // arrange
    const root = "/store/assets";
    const candidate = "/store/secret.txt";

    // act
    const within = isPathWithinRoot(root, candidate);

    // assert
    expect(within).toBe(false);
  });
});

describe("isConfinedAsset", () => {
  it("accepts identical dev/ino inside the root", () => {
    // arrange
    const input = {
      opened: { dev: 1, ino: 42 },
      resolved: { dev: 1, ino: 42 },
      resolvedAsset: "/store/assets/guide.pdf",
      resolvedRoot: "/store/assets",
    };

    // act
    const confined = isConfinedAsset(input);

    // assert
    expect(confined).toBe(true);
  });

  it("rejects a dev mismatch", () => {
    // arrange
    const input = {
      opened: { dev: 1, ino: 42 },
      resolved: { dev: 2, ino: 42 },
      resolvedAsset: "/store/assets/guide.pdf",
      resolvedRoot: "/store/assets",
    };

    // act
    const confined = isConfinedAsset(input);

    // assert
    expect(confined).toBe(false);
  });

  it("rejects a resolved asset outside the resolved root", () => {
    // arrange
    const input = {
      opened: { dev: 1, ino: 42 },
      resolved: { dev: 1, ino: 42 },
      resolvedAsset: "/store/secret.txt",
      resolvedRoot: "/store/assets",
    };

    // act
    const confined = isConfinedAsset(input);

    // assert
    expect(confined).toBe(false);
  });
});

describe("matchesAssetIdentity", () => {
  it("rejects a size mismatch", () => {
    // arrange
    const stats = { isFile: true, size: 10 };
    const asset: Pick<ProductAsset, "sizeBytes"> = { sizeBytes: 11 };

    // act
    const matches = matchesAssetIdentity(stats, asset);

    // assert
    expect(matches).toBe(false);
  });

  it("rejects a non-file", () => {
    // arrange
    const stats = { isFile: false, size: 10 };
    const asset: Pick<ProductAsset, "sizeBytes"> = { sizeBytes: 10 };

    // act
    const matches = matchesAssetIdentity(stats, asset);

    // assert
    expect(matches).toBe(false);
  });

  it("accepts a matching file and size", () => {
    // arrange
    const stats = { isFile: true, size: 10 };
    const asset: Pick<ProductAsset, "sizeBytes"> = { sizeBytes: 10 };

    // act
    const matches = matchesAssetIdentity(stats, asset);

    // assert
    expect(matches).toBe(true);
  });
});

describe("matchesAssetDigest", () => {
  it("accepts an equal digest", () => {
    // arrange
    const computedSha256Hex = "abc123";
    const asset: Pick<ProductAsset, "sha256"> = { sha256: "abc123" };

    // act
    const matches = matchesAssetDigest(computedSha256Hex, asset);

    // assert
    expect(matches).toBe(true);
  });

  it("rejects a digest differing in one hex digit", () => {
    // arrange
    const computedSha256Hex = "abc123";
    const asset: Pick<ProductAsset, "sha256"> = { sha256: "abc124" };

    // act
    const matches = matchesAssetDigest(computedSha256Hex, asset);

    // assert
    expect(matches).toBe(false);
  });
});
