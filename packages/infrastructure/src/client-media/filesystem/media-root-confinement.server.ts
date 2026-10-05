import { accessSync, constants, statSync } from "node:fs";
import {
  mkdir,
  realpath,
  stat,
  open as openFile,
  type FileHandle,
} from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";

type DirectoryPlacement = "within-root" | "outside-root" | "missing";

type ConfinedFileOpening =
  | { kind: "opened"; file: FileHandle }
  | { kind: "outside-root" }
  | { kind: "missing" };

export function isReadyMediaRoot(root: string): boolean {
  try {
    accessSync(root, constants.R_OK | constants.W_OK);

    return statSync(root).isDirectory();
  } catch {
    return false;
  }
}

export function isPathWithinRoot(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);

  return (
    relativePath !== "" &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}

export async function directoryPlacement(
  root: string,
  directory: string,
): Promise<DirectoryPlacement> {
  const realDirectory = await nullWhenMissing(realpath(directory));

  if (realDirectory === null) {
    return "missing";
  }

  const realRoot = await realpath(root);

  return realDirectory === realRoot || isPathWithinRoot(realRoot, realDirectory)
    ? "within-root"
    : "outside-root";
}

export async function createConfinedFolders(
  root: string,
  relativeFolder: string,
): Promise<Exclude<DirectoryPlacement, "missing">> {
  let folder = root;

  for (const segment of relativeFolder.split("/")) {
    folder = join(folder, segment);
    await createFolderIfMissing(folder);

    if ((await directoryPlacement(root, folder)) !== "within-root") {
      return "outside-root";
    }
  }

  return "within-root";
}

export async function openConfinedFile(
  root: string,
  path: string,
): Promise<ConfinedFileOpening> {
  const file = await nullWhenMissing(openFile(path, "r"));

  if (file === null) {
    return { kind: "missing" };
  }

  const confined = await isOpenedFileWithinRoot({ root, path, file }).catch(
    async (error: unknown) => {
      await file.close();

      throw error;
    },
  );

  if (!confined) {
    await file.close();

    return { kind: "outside-root" };
  }

  return { kind: "opened", file };
}

export function hasErrorCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}

async function isOpenedFileWithinRoot({
  root,
  path,
  file,
}: {
  root: string;
  path: string;
  file: FileHandle;
}): Promise<boolean> {
  const [realRoot, realFile, opened] = await Promise.all([
    realpath(root),
    realpath(path),
    file.stat(),
  ]);
  const resolved = await stat(realFile);

  return (
    isPathWithinRoot(realRoot, realFile) &&
    opened.dev === resolved.dev &&
    opened.ino === resolved.ino
  );
}

async function createFolderIfMissing(folder: string): Promise<void> {
  try {
    await mkdir(folder);
  } catch (error) {
    if (!hasErrorCode(error, "EEXIST")) {
      throw error;
    }
  }
}

async function nullWhenMissing<T>(pending: Promise<T>): Promise<T | null> {
  try {
    return await pending;
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      return null;
    }

    throw error;
  }
}
