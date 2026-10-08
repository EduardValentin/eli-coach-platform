import { accessSync, constants, statSync } from "node:fs";

export function isReadyMediaRoot(root: string): boolean {
  try {
    accessSync(root, constants.R_OK | constants.W_OK);

    return statSync(root).isDirectory();
  } catch {
    return false;
  }
}
