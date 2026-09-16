import type { DatabaseClient } from "@eli-coach-platform/db";
import type { ManagementAuthenticator } from "@eli-coach-platform/domain/shared";
import { InMemoryProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import type { ManagementAuthConfig } from "@eli-coach-platform/infrastructure/management-auth/server";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { composeStoreFeature } from "./store-composition.server";

const storeAssetRoot = mkdtempSync(join(tmpdir(), "eli-coach-store-composition-"));

function createDatabaseStub(): DatabaseClient {
  return {
    execute: () => {
      throw new Error("database down");
    },
  } as unknown as DatabaseClient;
}

function createManagementAuth(): { authenticator: ManagementAuthenticator; config: ManagementAuthConfig } {
  return {
    authenticator: { authenticate: async () => ({ status: "unauthenticated" }) },
    config: { principalId: "management", secret: "unit-test-secret", transportPolicy: "any" },
  };
}

describe("composeStoreFeature", () => {
  afterAll(async () => {
    await rm(storeAssetRoot, { force: true, recursive: true });
  });

  it("maps a catalog repository failure to an unavailable response", async () => {
    // arrange
    const feature = composeStoreFeature({
      appBasePath: "/",
      botVerifier: { verifySubmission: async () => ({ status: "verified" }) },
      clock: { now: () => new Date() },
      database: createDatabaseStub(),
      logger: { error: () => {} },
      contactEmail: "contact@evoa.fit",
      managementAuth: createManagementAuth(),
      productEmail: new InMemoryProductEmail(),
      publicAppUrl: "https://eli.example",
      storeAssetRoot,
    });

    // act
    const response = await feature.catalog.getPublishedCatalog();
    const body = await response.json();

    // assert
    expect(response.status).toBe(503);
    expect(body).toMatchObject({ success: false });
  });

  it("maps a grant repository failure to a temporary-unavailable response", async () => {
    // arrange
    const feature = composeStoreFeature({
      appBasePath: "/",
      botVerifier: { verifySubmission: async () => ({ status: "verified" }) },
      clock: { now: () => new Date() },
      database: createDatabaseStub(),
      logger: { error: () => {} },
      contactEmail: "contact@evoa.fit",
      managementAuth: createManagementAuth(),
      productEmail: new InMemoryProductEmail(),
      publicAppUrl: "https://eli.example",
      storeAssetRoot,
    });
    const formData = new FormData();
    formData.set("token", "unit-test-grant-token");

    // act
    const response = await feature.downloads.download(
      new Request("http://localhost/api/store/downloads", { method: "POST", body: formData }),
    );
    const body = await response.text();

    // assert
    expect(response.status).toBe(503);
    expect(body).toContain("Downloads temporarily unavailable");
  });
});
