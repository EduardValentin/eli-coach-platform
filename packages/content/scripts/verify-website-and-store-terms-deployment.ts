import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { WEBSITE_AND_STORE_TERMS_PDF_ARTIFACT } from "../src/website-and-store-terms";
import { publishedTermsPackageSpecifier } from "../tooling/published-website-and-store-terms-history";

const execFile = promisify(execFileCallback);
const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const deploymentRoot = resolve(tmpdir());

function assertTemporaryDeploymentDirectory(directory: string): void {
  const directoryRelativeToTmpdir = relative(deploymentRoot, resolve(directory));
  if (
    directoryRelativeToTmpdir === "" ||
    directoryRelativeToTmpdir.startsWith("..") ||
    directoryRelativeToTmpdir.includes("../")
  ) {
    throw new Error(
      `Refusing to remove deployment directory outside tmpdir: ${directory}`,
    );
  }
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main(): Promise<void> {
  let deploymentDirectory: string | undefined;

  try {
    deploymentDirectory = await mkdtemp(
      join(tmpdir(), "eli-coach-platform-terms-deployment-"),
    );
    await execFile(
      "pnpm",
      [
        "--filter",
        "@eli-coach-platform/platform",
        "--prod",
        "deploy",
        deploymentDirectory,
      ],
      { cwd: repositoryRoot },
    );

    const deployedRequire = createRequire(
      join(deploymentDirectory, "package.json"),
    );
    const artifactSpecifier = publishedTermsPackageSpecifier(
      WEBSITE_AND_STORE_TERMS_PDF_ARTIFACT.packageExportSubpath,
    );
    const deployedArtifactPath = deployedRequire.resolve(artifactSpecifier);
    const deployedArtifactBytes = await readFile(deployedArtifactPath);
    const deployedArtifactSha256 = sha256Hex(deployedArtifactBytes);

    if (
      deployedArtifactSha256 !== WEBSITE_AND_STORE_TERMS_PDF_ARTIFACT.pdfSha256
    ) {
      throw new Error(
        `Deployed Terms artifact hash mismatch: expected ${WEBSITE_AND_STORE_TERMS_PDF_ARTIFACT.pdfSha256}, received ${deployedArtifactSha256}.`,
      );
    }

    console.info(`Resolved deployed Terms artifact: ${deployedArtifactPath}`);
    console.info(`Verified deployed Terms artifact SHA-256: ${deployedArtifactSha256}`);
  } finally {
    if (deploymentDirectory !== undefined) {
      assertTemporaryDeploymentDirectory(deploymentDirectory);
      await rm(deploymentDirectory, { force: true, recursive: true });
    }
  }
}

await main();
