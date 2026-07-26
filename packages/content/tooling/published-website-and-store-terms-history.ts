import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const PUBLISHED_TERMS_SOURCE_DIRECTORY =
  "packages/content/src/website-and-store-terms/versions/";
const PUBLISHED_TERMS_ARTIFACT_DIRECTORY =
  "packages/content/artifacts/website-and-store-terms/";
const PUBLISHED_TERMS_PATHS = [
  PUBLISHED_TERMS_SOURCE_DIRECTORY,
  PUBLISHED_TERMS_ARTIFACT_DIRECTORY,
] as const;

type PublishedTermsHistoryOptions = {
  baseSha: string;
  currentVersions: readonly string[];
  repositoryRoot: string;
};

function publishedTermsVersionForPath(path: string): string | undefined {
  if (path.startsWith(PUBLISHED_TERMS_ARTIFACT_DIRECTORY)) {
    return path.slice(PUBLISHED_TERMS_ARTIFACT_DIRECTORY.length).split("/", 1)[0];
  }

  if (!path.startsWith(PUBLISHED_TERMS_SOURCE_DIRECTORY)) {
    return undefined;
  }

  const sourcePath = path.slice(PUBLISHED_TERMS_SOURCE_DIRECTORY.length);
  const directVersionFile = sourcePath.match(
    /^([^/]+?)(?:\.manifest)?\.ts$/,
  );

  return directVersionFile?.[1] ?? sourcePath.split("/", 1)[0];
}

function publishedTermsVersionsForPaths(paths: readonly string[]): string[] {
  return paths
    .map((path) => publishedTermsVersionForPath(path))
    .filter((version): version is string => version !== undefined && version !== "");
}

function parseNameStatusRecord(record: string): {
  paths: string[];
  status: string;
} {
  const [status, ...paths] = record.split("\t");

  return { paths, status };
}

function isNewPublicationAddition(status: string): boolean {
  return status === "A";
}

async function runGit(
  repositoryRoot: string,
  args: readonly string[],
): Promise<string> {
  const { stdout } = await execFile("git", args, { cwd: repositoryRoot });

  return stdout.trim();
}

export function assertNoPublishedVersionMutation(
  nameStatusRecords: readonly string[],
): void {
  for (const record of nameStatusRecords) {
    const { paths, status } = parseNameStatusRecord(record);
    if (isNewPublicationAddition(status)) {
      continue;
    }

    const version = publishedTermsVersionsForPaths(paths)[0];
    if (version !== undefined) {
      throw new Error(`Published Terms version ${version} is immutable.`);
    }
  }
}

export async function assertPublishedTermsHistoryIsAppendOnly({
  baseSha,
  currentVersions,
  repositoryRoot,
}: PublishedTermsHistoryOptions): Promise<void> {
  const baselinePaths = (
    await runGit(repositoryRoot, [
      "ls-tree",
      "-r",
      "--name-only",
      baseSha,
      "--",
      ...PUBLISHED_TERMS_PATHS,
    ])
  ).split("\n").filter(Boolean);
  const baselineVersions = new Set(publishedTermsVersionsForPaths(baselinePaths));
  const currentVersionSet = new Set(currentVersions);

  for (const version of baselineVersions) {
    if (!currentVersionSet.has(version)) {
      throw new Error(
        `Published Terms version ${version} is missing from the current registry.`,
      );
    }
  }

  const nameStatusRecords = (
    await runGit(repositoryRoot, [
      "diff",
      "--name-status",
      "-M",
      baseSha,
      "HEAD",
      "--",
      ...PUBLISHED_TERMS_PATHS,
    ])
  ).split("\n").filter(Boolean);

  assertNoPublishedVersionMutation(nameStatusRecords);
}

export function publishedTermsPackageSpecifier(
  packageExportSubpath: string,
): string {
  if (!packageExportSubpath.startsWith("./")) {
    throw new Error(
      `Published Terms package export must begin with "./": ${packageExportSubpath}`,
    );
  }

  return `@eli-coach-platform/content/${packageExportSubpath.slice(2)}`;
}

export function termsHistoryBaseRefFromArgs(args: readonly string[]): string {
  const effectiveArgs = args[0] === "--" ? args.slice(1) : args;
  const [option, baseRef] = effectiveArgs;
  if (
    effectiveArgs.length !== 2 ||
    option !== "--base" ||
    baseRef === undefined ||
    baseRef.trim() === "" ||
    baseRef.startsWith("-")
  ) {
    throw new Error("A valid --base Git ref is required for Terms history verification.");
  }

  return baseRef;
}

export async function resolvePublishedTermsMergeBase(options: {
  baseRef: string;
  repositoryRoot: string;
}): Promise<string> {
  const { baseRef, repositoryRoot } = options;

  try {
    return await runGit(repositoryRoot, ["merge-base", "HEAD", baseRef]);
  } catch {
    throw new Error(
      `Invalid --base Git ref for Terms history verification: ${baseRef}`,
    );
  }
}
