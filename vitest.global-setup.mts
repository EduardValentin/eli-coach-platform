import { buildPlatformServer } from "./apps/platform/integration-test-config/platform-build";

export async function setup(): Promise<void> {
  await buildPlatformServer();
}
