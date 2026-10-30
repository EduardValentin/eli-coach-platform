import { createEmailAcceptance } from "~/shared/submission-checks/email-address";
import type { DatabaseClient } from "~/shared/database";
import type {
  ManagementAuthenticatorPort,
  ManagementAuthConfig,
} from "~/bounded-contexts/sales/store/adapters/inbound/http/management/management-auth/management-authenticator-port.server";
import { InMemoryProductEmailAdapter } from "~/shared/email/index.server";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { composeStoreFeature } from "./composition.server";

const storeAssetRoot = mkdtempSync(
  join(tmpdir(), "eli-coach-store-composition-"),
);

function createDatabaseStub(): DatabaseClient {
  return {
    execute: () => {
      throw new Error("database down");
    },
  } as unknown as DatabaseClient;
}

function createManagementAuth(): {
  managementAuthenticatorPort: ManagementAuthenticatorPort;
  config: ManagementAuthConfig;
} {
  return {
    managementAuthenticatorPort: {
      authenticate: async () => ({ status: "unauthenticated" }),
    },
    config: {
      principalId: "management",
      secret: "unit-test-secret",
      transportPolicy: "any",
    },
  };
}

function createLogger() {
  return { error: () => {}, warn: () => {}, info: () => {} };
}

describe("composeStoreFeature", () => {
  afterAll(async () => {
    await rm(storeAssetRoot, { force: true, recursive: true });
  });

  it("maps a catalog repository failure to an unavailable response", async () => {
    // arrange
    const feature = composeStoreFeature({
      appBasePath: "/",
      botVerifierPort: {
        verifySubmission: async () => ({ status: "verified" }),
      },
      clockPort: { now: () => new Date() },
      database: createDatabaseStub(),
      contactEmail: "contact@evoa.fit",
      emailAcceptancePort: createEmailAcceptance("allowed"),
      loggerPort: createLogger(),
      managementAuth: createManagementAuth(),
      productEmailPort: new InMemoryProductEmailAdapter(),
      publicAppUrl: "https://eli.example",
      storeAssetRoot,
      termsFacade: {
        currentTerms: () => ({ version: "1.0", hash: "terms-hash" }),
      },
    });

    // act
    const response = await feature.storeCatalogController.getPublishedCatalog();
    const body = await response.json();

    // assert
    expect(response.status).toBe(503);
    expect(body).toMatchObject({ success: false });
  });

  it("maps a grant repository failure to a temporary-unavailable response", async () => {
    // arrange
    const feature = composeStoreFeature({
      appBasePath: "/",
      botVerifierPort: {
        verifySubmission: async () => ({ status: "verified" }),
      },
      clockPort: { now: () => new Date() },
      database: createDatabaseStub(),
      contactEmail: "contact@evoa.fit",
      emailAcceptancePort: createEmailAcceptance("allowed"),
      loggerPort: createLogger(),
      managementAuth: createManagementAuth(),
      productEmailPort: new InMemoryProductEmailAdapter(),
      publicAppUrl: "https://eli.example",
      storeAssetRoot,
      termsFacade: {
        currentTerms: () => ({ version: "1.0", hash: "terms-hash" }),
      },
    });
    const formData = new FormData();
    formData.set("token", "unit-test-grant-token");

    // act
    const response = await feature.storeDownloadController.download(
      new Request("http://localhost/api/store/downloads", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.text();

    // assert
    expect(response.status).toBe(503);
    expect(body).toContain("Downloads temporarily unavailable");
  });

  it("hands the subaddress policy to the store request", async () => {
    // arrange
    const feature = composeStoreFeature({
      appBasePath: "/",
      botVerifierPort: {
        verifySubmission: async () => ({ status: "verified" }),
      },
      clockPort: { now: () => new Date() },
      database: createDatabaseStub(),
      contactEmail: "contact@evoa.fit",
      emailAcceptancePort: createEmailAcceptance("refused"),
      loggerPort: createLogger(),
      managementAuth: createManagementAuth(),
      productEmailPort: new InMemoryProductEmailAdapter(),
      publicAppUrl: "https://eli.example",
      storeAssetRoot,
      termsFacade: {
        currentTerms: () => ({ version: "1.0", hash: "terms-hash" }),
      },
    });
    const formData = new FormData();
    formData.set("email", "woman+guides@example.com");
    formData.set("idempotencyKey", "d744ad8e-632c-4dfe-ac70-033bd3221522");
    formData.set("marketingConsent", "false");
    formData.set("productSlugs", JSON.stringify(["hormone-harmony"]));
    formData.set("termsAccepted", "true");

    // act
    const response = await feature.storeAcquisitionController.acquire(
      new Request("http://localhost/api/store/acquisitions", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    // assert
    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: { code: "email_subaddress_refused" },
    });
  });
});
