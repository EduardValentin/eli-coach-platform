import { loadRuntimeEnvironment, type RuntimeEnvironment } from "@eli-coach-platform/config";

const runtimeEnvironment = loadRuntimeEnvironment(process.env);

export function getRuntimeEnvironment(): RuntimeEnvironment {
  return runtimeEnvironment;
}
