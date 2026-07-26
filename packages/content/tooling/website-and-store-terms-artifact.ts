import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { LegalDocument } from "../src/legal-document";
import type { WebsiteAndStoreTermsPdfArtifact } from "../src/website-and-store-terms/types";
import { legalDocumentSha256, sha256Hex } from "./canonical-legal-document";

export type VersionedTermsArtifactPaths = Readonly<{
  pdfPath: string;
  manifestPath: string;
}>;

export type PublishVersionedTermsArtifactOptions = Readonly<{
  document: LegalDocument;
  pdfBytes: Uint8Array;
  paths: VersionedTermsArtifactPaths;
}>;

export type PublishedVersionedTermsArtifact = Readonly<{
  descriptor: WebsiteAndStoreTermsPdfArtifact;
  status: "created" | "verified";
}>;

const PUBLICATION_COORDINATION_ATTEMPTS = 8;
const PUBLICATION_COORDINATION_DELAY_MS = 10;

function renderManifest(descriptor: WebsiteAndStoreTermsPdfArtifact): string {
  return `import type { WebsiteAndStoreTermsPdfArtifact } from "../types";

export const WEBSITE_AND_STORE_TERMS_V1_0_ARTIFACT = {
  termsVersion: "${descriptor.termsVersion}",
  effectiveDate: "${descriptor.effectiveDate}",
  mediaType: "${descriptor.mediaType}",
  filename: "${descriptor.filename}",
  packageExportSubpath: "${descriptor.packageExportSubpath}",
  contentSha256: "${descriptor.contentSha256}",
  pdfSha256: "${descriptor.pdfSha256}",
} as const satisfies WebsiteAndStoreTermsPdfArtifact;
`;
}

async function readPublishedFile(path: string): Promise<Buffer | undefined> {
  try {
    return await readFile(path);
  } catch (error) {
    if (isFileSystemError(error, "ENOENT")) {
      return undefined;
    }

    throw error;
  }
}

function hasMatchingBytes(actual: Uint8Array, expected: Uint8Array): boolean {
  return Buffer.from(actual).equals(Buffer.from(expected));
}

function isFileSystemError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

type PublishedArtifactState =
  | "missing"
  | "partial"
  | "matching"
  | "pdf-differs"
  | "manifest-differs";

async function publishedArtifactState({
  paths,
  expectedManifest,
  expectedPdf,
}: Readonly<{
  paths: VersionedTermsArtifactPaths;
  expectedManifest: string;
  expectedPdf: Uint8Array;
}>): Promise<PublishedArtifactState> {
  const [publishedPdf, publishedManifest] = await Promise.all([
    readPublishedFile(paths.pdfPath),
    readPublishedFile(paths.manifestPath),
  ]);

  if (publishedPdf === undefined && publishedManifest === undefined) {
    return "missing";
  }

  if (publishedPdf === undefined || publishedManifest === undefined) {
    return "partial";
  }

  if (!hasMatchingBytes(publishedPdf, expectedPdf)) {
    return "pdf-differs";
  }

  if (!hasMatchingBytes(publishedManifest, Buffer.from(expectedManifest))) {
    return "manifest-differs";
  }

  return "matching";
}

function throwForPublishedArtifactState(state: PublishedArtifactState): never {
  switch (state) {
    case "partial":
      throw new Error("Published Terms artifact is partially published");
    case "pdf-differs":
      throw new Error("Published Terms artifact differs");
    case "manifest-differs":
      throw new Error("Published Terms manifest differs");
    case "missing":
    case "matching":
      throw new Error(`Unexpected published Terms artifact state: ${state}`);
  }
}

function publicationLockPath(paths: VersionedTermsArtifactPaths): string {
  return `${paths.pdfPath}.publishing`;
}

async function delayPublicationCoordination(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, PUBLICATION_COORDINATION_DELAY_MS);
  });
}

async function releasePublicationLock(lockPath: string): Promise<void> {
  try {
    await unlink(lockPath);
  } catch (error) {
    if (!isFileSystemError(error, "ENOENT")) {
      throw error;
    }
  }
}

async function removeCreatedPdfAfterManifestFailure({
  paths,
  expectedManifest,
  expectedPdf,
}: Readonly<{
  paths: VersionedTermsArtifactPaths;
  expectedManifest: string;
  expectedPdf: Uint8Array;
}>): Promise<void> {
  const state = await publishedArtifactState({
    paths,
    expectedManifest,
    expectedPdf,
  });

  if (state === "partial") {
    const publishedManifest = await readPublishedFile(paths.manifestPath);
    const publishedPdf = await readPublishedFile(paths.pdfPath);

    if (publishedManifest === undefined && publishedPdf !== undefined) {
      await unlink(paths.pdfPath);
    }
  }
}

export async function publishVersionedTermsArtifact({
  document,
  pdfBytes,
  paths,
}: PublishVersionedTermsArtifactOptions): Promise<PublishedVersionedTermsArtifact> {
  const descriptor = {
    termsVersion: document.version,
    effectiveDate: document.effectiveDate,
    mediaType: "application/pdf",
    filename: "terms-and-conditions.pdf",
    packageExportSubpath:
      "./artifacts/website-and-store-terms/1.0/terms-and-conditions.pdf",
    contentSha256: legalDocumentSha256(document),
    pdfSha256: sha256Hex(pdfBytes),
  } as const satisfies WebsiteAndStoreTermsPdfArtifact;
  const manifest = renderManifest(descriptor);
  const expectedArtifact = {
    paths,
    expectedManifest: manifest,
    expectedPdf: pdfBytes,
  };
  const initialState = await publishedArtifactState(expectedArtifact);

  if (initialState === "matching") {
    return { descriptor, status: "verified" };
  }

  if (initialState !== "missing") {
    return throwForPublishedArtifactState(initialState);
  }

  await Promise.all([
    mkdir(dirname(paths.pdfPath), { recursive: true }),
    mkdir(dirname(paths.manifestPath), { recursive: true }),
  ]);
  const lockPath = publicationLockPath(paths);

  for (let attempt = 0; attempt < PUBLICATION_COORDINATION_ATTEMPTS; attempt += 1) {
    try {
      await writeFile(lockPath, "", { flag: "wx" });
    } catch (error) {
      if (!isFileSystemError(error, "EEXIST")) {
        throw error;
      }

      await delayPublicationCoordination();
      continue;
    }

    try {
      const stateAfterLock = await publishedArtifactState(expectedArtifact);

      if (stateAfterLock === "matching") {
        return { descriptor, status: "verified" };
      }

      if (stateAfterLock !== "missing") {
        await delayPublicationCoordination();
        continue;
      }

      try {
        await writeFile(paths.pdfPath, pdfBytes, { flag: "wx" });
      } catch (error) {
        if (!isFileSystemError(error, "EEXIST")) {
          throw error;
        }

        await delayPublicationCoordination();
        continue;
      }

      try {
        await writeFile(paths.manifestPath, manifest, { flag: "wx" });
      } catch (error) {
        if (isFileSystemError(error, "EEXIST")) {
          await delayPublicationCoordination();
          continue;
        }

        await removeCreatedPdfAfterManifestFailure(expectedArtifact);
        throw error;
      }

      return { descriptor, status: "created" };
    } finally {
      await releasePublicationLock(lockPath);
    }
  }

  const finalState = await publishedArtifactState(expectedArtifact);

  if (finalState === "matching") {
    return { descriptor, status: "verified" };
  }

  if (finalState !== "missing") {
    return throwForPublishedArtifactState(finalState);
  }

  throw new Error("Concurrent Terms artifact publication did not complete");
}
