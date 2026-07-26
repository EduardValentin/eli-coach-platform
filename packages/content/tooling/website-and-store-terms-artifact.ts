import { access, mkdir, readFile, writeFile } from "node:fs/promises";
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

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function hasMatchingBytes(actual: Uint8Array, expected: Uint8Array): boolean {
  return Buffer.from(actual).equals(Buffer.from(expected));
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
  const [pdfExists, manifestExists] = await Promise.all([
    pathExists(paths.pdfPath),
    pathExists(paths.manifestPath),
  ]);

  if (pdfExists !== manifestExists) {
    throw new Error("Published Terms artifact is partially published");
  }

  if (pdfExists && manifestExists) {
    const [publishedPdf, publishedManifest] = await Promise.all([
      readFile(paths.pdfPath),
      readFile(paths.manifestPath),
    ]);

    if (!hasMatchingBytes(publishedPdf, pdfBytes)) {
      throw new Error("Published Terms artifact differs");
    }

    if (!hasMatchingBytes(publishedManifest, Buffer.from(manifest))) {
      throw new Error("Published Terms manifest differs");
    }

    return { descriptor, status: "verified" };
  }

  await Promise.all([
    mkdir(dirname(paths.pdfPath), { recursive: true }),
    mkdir(dirname(paths.manifestPath), { recursive: true }),
  ]);
  await writeFile(paths.pdfPath, pdfBytes, { flag: "wx" });
  await writeFile(paths.manifestPath, manifest, { flag: "wx" });

  return { descriptor, status: "created" };
}
