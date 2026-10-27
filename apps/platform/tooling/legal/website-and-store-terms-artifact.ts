const SAFE_TERMS_VERSION = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

export function websiteAndStoreTermsPdfArtifactPath(version: string): string {
  if (!SAFE_TERMS_VERSION.test(version)) {
    throw new Error(`Invalid Terms version for artifact path: ${version}`);
  }

  return `apps/platform/src/bounded-contexts/legal/legal/artifacts/website-and-store-terms/${version}/terms-and-conditions.pdf`;
}
