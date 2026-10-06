import { open as openFile, type FileHandle } from "node:fs/promises";

import { hasErrorCode } from "./media-root-confinement.server";

export async function writeNewFile(
  path: string,
  bytes: Uint8Array,
): Promise<"written" | "already-exists"> {
  let file: FileHandle;

  try {
    file = await openFile(path, "wx");
  } catch (error) {
    if (hasErrorCode(error, "EEXIST")) {
      return "already-exists";
    }

    throw error;
  }

  try {
    await file.writeFile(bytes);
    await file.sync();
  } finally {
    await file.close();
  }

  return "written";
}

export async function readThenClose(file: FileHandle): Promise<Buffer> {
  try {
    return await file.readFile();
  } finally {
    await file.close();
  }
}

// Not an async generator: an unstarted one ignores return() and would leak the file.
export function streamThenClose(file: FileHandle): AsyncIterable<Uint8Array> {
  const stream = file.createReadStream();
  const closed = new Promise<void>((resolve) => stream.once("close", resolve));

  return {
    [Symbol.asyncIterator]() {
      const chunks = stream[Symbol.asyncIterator]();

      return {
        next: async () => {
          const chunk = await chunks.next();

          if (chunk.done) {
            await closed;
          }

          return chunk;
        },
        return: async () => {
          stream.destroy();
          await closed;

          return { done: true, value: undefined };
        },
      };
    },
  };
}

export function streamWhenPulled(
  open: () => Promise<FileHandle>,
): AsyncIterable<Uint8Array> {
  return {
    [Symbol.asyncIterator]() {
      let chunks: Promise<AsyncIterator<Uint8Array>> | undefined;

      return {
        next: async () => {
          chunks ??= open().then((file) =>
            streamThenClose(file)[Symbol.asyncIterator](),
          );

          return (await chunks).next();
        },
        return: async () => {
          const opened = await chunks?.catch(() => undefined);
          await opened?.return?.();

          return { done: true, value: undefined };
        },
      };
    },
  };
}
