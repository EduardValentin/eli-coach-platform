import type { StoreTaxonomyValue } from "./models";
import {
  MAX_PUBLICATION_BYTES,
  type ProductCoverInput,
  type ProductDownloadInput,
  type ProductVersionMetadata,
  type PublicationIssue,
  type PublicationOperation,
} from "./product-publication-models";

const PRODUCT_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
/**
 * ASCII record and unit separators, spelled as escapes so they survive
 * editors and diffs. Neither can occur in a slug, a hex digest, or a
 * customer filename, so two distinct payloads cannot canonicalize to the
 * same string and collide as a false idempotent replay.
 */
const CANONICAL_FIELD_SEPARATOR = "";
const CANONICAL_LIST_SEPARATOR = "";

export function validateSlugFormat(slug: string): PublicationIssue | null {
  return PRODUCT_SLUG_PATTERN.test(slug)
    ? null
    : { code: "invalid_slug", slug };
}

export type TaxonomyResolution = {
  issues: readonly PublicationIssue[];
  values: readonly StoreTaxonomyValue[];
};

export function resolveTaxonomy(
  requestedSlugs: readonly string[],
  available: readonly StoreTaxonomyValue[],
  unknownCode: "unknown_goal" | "unknown_type",
): TaxonomyResolution {
  const values: StoreTaxonomyValue[] = [];
  const issues: PublicationIssue[] = [];

  for (const slug of requestedSlugs) {
    const match = available.find((value) => value.slug === slug);

    if (match) {
      values.push(match);
      continue;
    }

    issues.push({
      code: unknownCode,
      acceptedSlugs: available.map((value) => value.slug),
      slug,
    });
  }

  return { issues, values };
}

export function checkPayloadSize(
  cover: ProductCoverInput,
  downloads: readonly ProductDownloadInput[],
): PublicationIssue | null {
  const totalBytes = downloads.reduce(
    (total, download) => total + download.bytes.byteLength,
    cover.bytes.byteLength,
  );

  return totalBytes > MAX_PUBLICATION_BYTES
    ? { code: "payload_too_large", maxBytes: MAX_PUBLICATION_BYTES, totalBytes }
    : null;
}

export function buildPublicationDigest(
  input: {
    cover: ProductCoverInput;
    downloads: readonly ProductDownloadInput[];
    metadata: ProductVersionMetadata;
    operation: PublicationOperation;
    target: string;
  },
  sha256: (bytes: Uint8Array) => string,
): string {
  const canonical = [
    input.operation,
    input.target,
    input.metadata.title,
    input.metadata.creatorName,
    input.metadata.cardSummary,
    input.metadata.detailDescription,
    input.metadata.includedItems.join(CANONICAL_LIST_SEPARATOR),
    input.metadata.typeSlugs.join(CANONICAL_LIST_SEPARATOR),
    input.metadata.goalSlugs.join(CANONICAL_LIST_SEPARATOR),
    input.cover.alt,
    sha256(input.cover.bytes),
    input.downloads
      .map(
        (download) => `${download.customerFilename}=${sha256(download.bytes)}`,
      )
      .join(CANONICAL_LIST_SEPARATOR),
  ].join(CANONICAL_FIELD_SEPARATOR);

  return sha256(new TextEncoder().encode(canonical));
}

export type PublicationTarget =
  | { kind: "new"; slug: string }
  | { kind: "revision"; targetProductSlug: string };

export function resolvePublicationTarget(metadata: {
  slug?: string;
  targetProductSlug?: string;
}): PublicationTarget | null {
  if (metadata.targetProductSlug) {
    return { kind: "revision", targetProductSlug: metadata.targetProductSlug };
  }

  if (metadata.slug) {
    return { kind: "new", slug: metadata.slug };
  }

  return null;
}
