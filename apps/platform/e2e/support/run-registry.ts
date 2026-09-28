import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { resolve } from "node:path";

import { e2eDirectory } from "./repo-paths";

const runtimeDirectory = resolve(e2eDirectory, ".runtime");
const REGISTRY_FILE_SUFFIX = ".log";

export type RunRegistry = {
  fileName(runId: string): string;
  filePath(runId: string): string;
  read(runId: string): string[];
  record(entry: string, runId: string): void;
  recordedRunIds(): string[];
  remove(runId: string): void;
};

export function runRegistry(filePrefix: string): RunRegistry {
  const fileName = (runId: string) =>
    `${filePrefix}${runId}${REGISTRY_FILE_SUFFIX}`;
  const filePath = (runId: string) =>
    resolve(runtimeDirectory, fileName(runId));

  return {
    fileName,
    filePath,
    read(runId) {
      const path = filePath(runId);

      if (!existsSync(path)) {
        return [];
      }

      return readFileSync(path, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    },
    record(entry, runId) {
      mkdirSync(runtimeDirectory, { recursive: true });
      appendFileSync(filePath(runId), `${entry}\n`);
    },
    recordedRunIds() {
      if (!existsSync(runtimeDirectory)) {
        return [];
      }

      return readdirSync(runtimeDirectory)
        .filter(
          (name) =>
            name.startsWith(filePrefix) && name.endsWith(REGISTRY_FILE_SUFFIX),
        )
        .map((name) =>
          name.slice(filePrefix.length, -REGISTRY_FILE_SUFFIX.length),
        );
    },
    remove(runId) {
      const path = filePath(runId);

      if (existsSync(path)) {
        rmSync(path);
      }
    },
  };
}
