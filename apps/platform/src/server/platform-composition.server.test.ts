import { loadRuntimeEnvironment } from "@eli-coach-platform/config/runtime";
import { CLERK_TEST_ENVIRONMENT } from "@eli-coach-platform/config/test-support";
import type { DatabaseClient } from "@eli-coach-platform/db";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { composePlatformFeature } from "./platform-composition.server";

const storeAssetRoot = mkdtempSync(join(tmpdir(), "eli-coach-platform-composition-"));

function createDatabaseStub(): DatabaseClient {
  return {
    select: () => {
      throw new Error("database down");
    },
  } as unknown as DatabaseClient;
}

function createRuntimeEnvironment() {
  return loadRuntimeEnvironment({
    APP_NAME: "eli-coach-platform",
    ...CLERK_TEST_ENVIRONMENT,
    ENVIRONMENT: "local",
    MANAGEMENT_API_SECRET: "unit-test-management-api-secret-value",
    NODE_ENV: "development",
    PUBLIC_APP_URL: "https://eli.example",
    STORE_ASSET_ROOT: storeAssetRoot,
    WAITLIST_MODE: "true",
  });
}

describe("composePlatformFeature", () => {
  afterAll(async () => {
    await rm(storeAssetRoot, { force: true, recursive: true });
  });

  it("reports readiness on a local environment without a database", async () => {
    // arrange
    const feature = composePlatformFeature({
      app: createRuntimeEnvironment(),
      botDetection: { provider: "static", token: "XXXX.DUMMY.TOKEN.XXXX" },
      database: createDatabaseStub(),
      version: "dev",
    });

    // act
    const response = feature.readyz.getStatus();

    // assert
    expect(response.status).toBe(200);
  });
});
