import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { PlatformContainer } from "~/server/container.server";

import { IntegrationTestSuite } from "./integration-test-suite";
import { PostgresContainer } from "./postgres-container";
import { loadIntegrationTestEnvironment } from "./runtime-environment";
import { WireMockContainer } from "./wire-mock/wire-mock-container";
import { resendEmails } from "./wire-mock/expectations/resend-emails";
import { turnstileSiteverify } from "./wire-mock/expectations/turnstile-siteverify";

/**
 * A suite for tests that enter the application through an API route. Every
 * dependency it talks to runs for real: Postgres in its own container, and the
 * third-party HTTP services behind WireMock serving their documented
 * contracts.
 */
export class ApiIntegrationTestSuite extends IntegrationTestSuite {
  readonly postgres = new PostgresContainer();
  readonly wireMock = new WireMockContainer([resendEmails, turnstileSiteverify]);
  protected readonly containers = [this.postgres, this.wireMock];

  private readonly integrationTestEnvironment = loadIntegrationTestEnvironment();
  private storeAssetRoot: string | null = null;
  private platformContainer: PlatformContainer | null = null;

  override async start(): Promise<void> {
    this.storeAssetRoot = await mkdtemp(
      join(tmpdir(), "eli-coach-store-assets-integration-"),
    );
    await super.start();

    // First evaluation of the application, and so of every SDK that reads its
    // endpoint once at module scope, happens here — after the containers exist
    // and after their ports have reached the environment.
    const { createPlatformContainer } = await import(
      "~/server/container.server"
    );

    this.platformContainer = createPlatformContainer({
      runtimeEnvironment: this.runtimeEnvironment(),
    });
  }

  override async stop(): Promise<void> {
    await this.platformContainer?.databasePool.end();
    this.platformContainer = null;

    if (this.storeAssetRoot) {
      await rm(this.storeAssetRoot, { force: true, recursive: true });
      this.storeAssetRoot = null;
    }

    await super.stop();
  }

  application(): PlatformContainer {
    if (!this.platformContainer) {
      throw new Error("Integration suite has not been started.");
    }

    return this.platformContainer;
  }

  assetRoot(): string {
    if (!this.storeAssetRoot) {
      throw new Error("Integration suite has not been started.");
    }

    return this.storeAssetRoot;
  }

  private runtimeEnvironment() {
    const { DATABASE_HOST, DATABASE_PORT } = this.postgres.settings();

    return this.integrationTestEnvironment.createRuntimeEnvironment({
      databaseHost: DATABASE_HOST!,
      databasePort: Number(DATABASE_PORT),
      settings: this.settings(),
      storeAssetRoot: this.assetRoot(),
    });
  }
}
