import {
  realpath,
  stat,
  open as openFile,
  type FileHandle,
} from "node:fs/promises";
import { isAbsolute, relative, sep } from "node:path";

type DirectoryPlacement = "within-root" | "outside-root" | "missing";

type ConfinedFileOpening =
  | { kind: "opened"; file: FileHandle }
  | { kind: "outside-root" }
  | { kind: "missing" };

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
