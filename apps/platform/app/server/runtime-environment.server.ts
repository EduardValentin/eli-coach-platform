import { loadRuntimeEnvironment, type RuntimeEnvironment } from "@eli-coach-platform/config";

let runtimeEnvironment: RuntimeEnvironment | null = null;

export function getRuntimeEnvironment(): RuntimeEnvironment {
  runtimeEnvironment ??= loadRuntimeEnvironment(process.env);

  return runtimeEnvironment;
}
