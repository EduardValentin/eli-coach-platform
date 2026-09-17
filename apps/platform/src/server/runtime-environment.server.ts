import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { loadRuntimeEnvironment } from "@eli-coach-platform/config/runtime";

let runtimeEnvironment: RuntimeEnvironment | null = null;

export function getRuntimeEnvironment(): RuntimeEnvironment {
  runtimeEnvironment ??= loadRuntimeEnvironment(process.env);

  return runtimeEnvironment;
}
