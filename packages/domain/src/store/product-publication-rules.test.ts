import { describe, expect, it } from "vitest";

import {
  buildPublicationDigest,
  checkPayloadSize,
  resolvePublicationTarget,
  resolveTaxonomy,
  validateSlugFormat,
} from "./product-publication-rules";
import { MAX_PUBLICATION_BYTES } from "./product-publication-models";
import type { ProductCoverInput, ProductDownloadInput, ProductVersionMetadata } from "./product-publication-models";
import type { StoreTaxonomyValue } from "./models";

describe("validateSlugFormat", () => {
  it.each([
    ["guide-1", null],
    ["Guide", { code: "invalid_slug", slug: "Guide" }],
  ])("evaluates %s", (slug, expected) => {
    // arrange

    // act
    const issue = validateSlugFormat(slug);

    // assert
    expect(issue).toEqual(expected);
  });
});

describe("resolveTaxonomy", () => {
  it("maps known slugs in request order and issues unknown_goal with acceptedSlugs", () => {
    // arrange
    const available: readonly StoreTaxonomyValue[] = [
      { slug: "sleep", label: "Sleep", displayOrder: 1 },
      { slug: "energy", label: "Energy", displayOrder: 2 },
    ];
    const requestedSlugs = ["energy", "sleep", "unknown"];

    // act
    const resolution = resolveTaxonomy(requestedSlugs, available, "unknown_goal");

    // assert
    expect(resolution).toEqual({
      values: [available[1], available[0]],
      issues: [
        {
          code: "unknown_goal",
          acceptedSlugs: ["sleep", "energy"],
          slug: "unknown",
        },
      ],
    });
  });
});

describe("checkPayloadSize", () => {
  it("issues payload_too_large one byte over the cap with totalBytes counting cover plus downloads", () => {
    // arrange
    const coverBytes = MAX_PUBLICATION_BYTES - 1;
    const cover: ProductCoverInput = { alt: "cover", bytes: new Uint8Array(coverBytes) };
    const downloads: readonly ProductDownloadInput[] = [
      { customerFilename: "guide.pdf", bytes: new Uint8Array(2) },
    ];

    // act
    const issue = checkPayloadSize(cover, downloads);

    // assert
    expect(issue).toEqual({
      code: "payload_too_large",
      maxBytes: MAX_PUBLICATION_BYTES,
      totalBytes: coverBytes + 2,
    });
  });

  it("returns null at or under the cap", () => {
    // arrange
    const cover: ProductCoverInput = { alt: "cover", bytes: new Uint8Array(MAX_PUBLICATION_BYTES) };
    const downloads: readonly ProductDownloadInput[] = [];

    // act
    const issue = checkPayloadSize(cover, downloads);

    // assert
    expect(issue).toBeNull();
  });
});

describe("buildPublicationDigest", () => {
  const metadata: ProductVersionMetadata = {
    cardSummary: "summary",
    creatorName: "creator",
    detailDescription: "detail",
    goalSlugs: ["sleep"],
    includedItems: ["item"],
    title: "title",
    typeSlugs: ["guide"],
  };
  const cover: ProductCoverInput = { alt: "cover", bytes: new Uint8Array([1, 2, 3]) };
  const sha256 = (bytes: Uint8Array) => `sha:${bytes.length}`;

  it("is stable for equal input", () => {
    // arrange
    const downloads: readonly ProductDownloadInput[] = [
      { customerFilename: "guide.pdf", bytes: new Uint8Array([4, 5]) },
    ];
    const input = { cover, downloads, metadata, operation: "create_product" as const, target: "guide" };

    // act
    const first = buildPublicationDigest(input, sha256);
    const second = buildPublicationDigest(input, sha256);

    // assert
    expect(first).toBe(second);
  });

  it("changes when a download filename changes", () => {
    // arrange
    const downloads: readonly ProductDownloadInput[] = [
      { customerFilename: "guide.pdf", bytes: new Uint8Array([4, 5]) },
    ];
    const renamedDownloads: readonly ProductDownloadInput[] = [
      { customerFilename: "workbook.pdf", bytes: new Uint8Array([4, 5]) },
    ];

    // act
    const original = buildPublicationDigest(
      { cover, downloads, metadata, operation: "create_product", target: "guide" },
      sha256,
    );
    const renamed = buildPublicationDigest(
      { cover, downloads: renamedDownloads, metadata, operation: "create_product", target: "guide" },
      sha256,
    );

    // assert
    expect(renamed).not.toBe(original);
  });
});

describe("resolvePublicationTarget", () => {
  it.each([
    [{ targetProductSlug: "guide", slug: "unused" }, { kind: "revision", targetProductSlug: "guide" }],
    [{ slug: "guide" }, { kind: "new", slug: "guide" }],
    [{}, null],
  ])("resolves %o", (metadata, expected) => {
    // arrange

    // act
    const target = resolvePublicationTarget(metadata);

    // assert
    expect(target).toEqual(expected);
  });
});
