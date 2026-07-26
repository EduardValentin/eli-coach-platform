import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, test } from "vitest";

import {
  assertNoPublishedVersionMutation,
  assertPublishedTermsHistoryIsAppendOnly,
  publishedTermsPackageSpecifier,
  termsHistoryBaseRefFromArgs,
} from "./published-website-and-store-terms-history";

const execFile = promisify(execFileCallback);
const temporaryRepositories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRepositories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

async function runGit(repositoryRoot: string, args: readonly string[]) {
  return execFile("git", args, { cwd: repositoryRoot });
}

async function createBaselineRepository(): Promise<{
  baseSha: string;
  repositoryRoot: string;
}> {
  const repositoryRoot = await mkdtemp(
    join(tmpdir(), "published-terms-history-test-"),
  );
  temporaryRepositories.push(repositoryRoot);

  await runGit(repositoryRoot, ["init"]);
  await runGit(repositoryRoot, ["config", "user.email", "test@example.com"]);
  await runGit(repositoryRoot, ["config", "user.name", "Terms test"]);
  await mkdir(
    join(
      repositoryRoot,
      "packages/content/src/website-and-store-terms/versions",
    ),
    { recursive: true },
  );
  await mkdir(
    join(
      repositoryRoot,
      "packages/content/artifacts/website-and-store-terms/1.0",
    ),
    { recursive: true },
  );
  await writeFile(
    join(
      repositoryRoot,
      "packages/content/src/website-and-store-terms/versions/1.0.ts",
    ),
    "export const version = '1.0';\n",
  );
  await writeFile(
    join(
      repositoryRoot,
      "packages/content/src/website-and-store-terms/versions/1.0.manifest.ts",
    ),
    "export const manifest = '1.0';\n",
  );
  await writeFile(
    join(
      repositoryRoot,
      "packages/content/artifacts/website-and-store-terms/1.0/terms-and-conditions.pdf",
    ),
    "baseline pdf",
  );
  await runGit(repositoryRoot, ["add", "."]);
  await runGit(repositoryRoot, ["commit", "-m", "baseline terms"]);

  const { stdout } = await runGit(repositoryRoot, ["rev-parse", "HEAD"]);

  return { baseSha: stdout.trim(), repositoryRoot };
}

describe("assertNoPublishedVersionMutation", () => {
  test("rejects modifying, deleting, or renaming a baseline publication", () => {
    // arrange
    const changes = [
      "M\tpackages/content/src/website-and-store-terms/versions/1.0.ts",
      "D\tpackages/content/src/website-and-store-terms/versions/1.0.manifest.ts",
      "R100\tpackages/content/artifacts/website-and-store-terms/1.0/terms-and-conditions.pdf\tpackages/content/artifacts/website-and-store-terms/1.0/renamed.pdf",
    ];

    // act
    const validate = () => assertNoPublishedVersionMutation(changes);

    // assert
    expect(validate).toThrow(/published Terms version 1\.0 is immutable/i);
  });

  test("allows a new version and a current-pointer change", () => {
    // arrange
    const changes = [
      "A\tpackages/content/src/website-and-store-terms/versions/2.0.ts",
      "A\tpackages/content/src/website-and-store-terms/versions/2.0.manifest.ts",
      "A\tpackages/content/artifacts/website-and-store-terms/2.0/terms-and-conditions.pdf",
      "M\tpackages/content/src/website-and-store-terms/index.ts",
    ];

    // act
    const validate = () => assertNoPublishedVersionMutation(changes);

    // assert
    expect(validate).not.toThrow();
  });
});

describe("assertPublishedTermsHistoryIsAppendOnly", () => {
  test("requires every baseline publication version to remain registered", async () => {
    // arrange
    const { baseSha, repositoryRoot } = await createBaselineRepository();

    // act
    const validate = () =>
      assertPublishedTermsHistoryIsAppendOnly({
        baseSha,
        currentVersions: [],
        repositoryRoot,
      });

    // assert
    await expect(validate).rejects.toThrow(
      /published Terms version 1\.0 is missing from the current registry/i,
    );
  });

  test("compares the explicit merge base with HEAD instead of local changes", async () => {
    // arrange
    const { baseSha, repositoryRoot } = await createBaselineRepository();
    await writeFile(
      join(
        repositoryRoot,
        "packages/content/src/website-and-store-terms/versions/1.0.ts",
      ),
      "export const version = 'locally changed';\n",
    );

    // act
    const validate = () =>
      assertPublishedTermsHistoryIsAppendOnly({
        baseSha,
        currentVersions: ["1.0"],
        repositoryRoot,
      });

    // assert
    await expect(validate()).resolves.toBeUndefined();
  });
});

describe("publishedTermsPackageSpecifier", () => {
  test("converts a package export subpath into the deployed package specifier", () => {
    // arrange
    const packageExportSubpath =
      "./artifacts/website-and-store-terms/1.0/terms-and-conditions.pdf";

    // act
    const specifier = publishedTermsPackageSpecifier(packageExportSubpath);

    // assert
    expect(specifier).toBe(
      "@eli-coach-platform/content/artifacts/website-and-store-terms/1.0/terms-and-conditions.pdf",
    );
  });
});

describe("termsHistoryBaseRefFromArgs", () => {
  test("accepts one explicit base ref passed through the package runner", () => {
    // arrange
    const args = ["--", "--base", "origin/main"];

    // act
    const baseRef = termsHistoryBaseRefFromArgs(args);

    // assert
    expect(baseRef).toBe("origin/main");
  });

  test("rejects missing, flag-like, and extra base arguments", () => {
    // arrange
    const invalidArguments = [[], ["--base", "--not-a-ref"], ["origin/main"]];

    // act
    const validate = () =>
      invalidArguments.map((args) => termsHistoryBaseRefFromArgs(args));

    // assert
    expect(validate).toThrow(/valid --base Git ref is required/i);
  });
});
