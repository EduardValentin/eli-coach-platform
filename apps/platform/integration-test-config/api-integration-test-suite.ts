import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { PlatformContainer } from "~/server/container.server";

import type { ApiRouteHandler } from "./api-routes";
import { IntegrationTestSuite } from "./integration-test-suite";
import { PostgresContainer } from "./postgres-container";
import { loadIntegrationTestEnvironment } from "./runtime-environment";
import { WireMockContainer } from "./wire-mock/wire-mock-container";
import {
  RESEND_EMAILS_PATH,
  resendEmails,
} from "./wire-mock/expectations/resend-emails";
import { turnstileSiteverifyStubs } from "./wire-mock/expectations/turnstile-siteverify";

/** One send as Resend received it, whether or not Resend accepted it. */
export type SentEmail = {
  html: string;
  idempotencyKey: string | null;
  subject: string;
  text: string;
  to: string;
};

/**
 * A suite for tests that enter the application through an API route. Every
 * dependency it talks to runs for real: Postgres in its own container, and the
 * third-party HTTP services behind WireMock serving their documented
 * contracts.
 *
 * Nothing here assembles the application. The suite publishes where each
 * container can be reached, and the application then builds itself from that
 * environment exactly as a deployed instance does.
 */
export class ApiIntegrationTestSuite extends IntegrationTestSuite {
  readonly postgres = new PostgresContainer();
  readonly wireMock = new WireMockContainer([
    resendEmails,
    ...turnstileSiteverifyStubs,
  ]);
  protected readonly containers = [this.postgres, this.wireMock];

  private readonly integrationTestEnvironment = loadIntegrationTestEnvironment();
  private storeAssetRoot: string | null = null;
  private platformContainer: PlatformContainer | null = null;
  private routeHandler: ApiRouteHandler | null = null;

  override async start(): Promise<void> {
    this.storeAssetRoot = await mkdtemp(
      join(tmpdir(), "eli-coach-store-assets-integration-"),
    );
    await super.start();

    // First evaluation of the application, and so of every SDK that reads its
    // endpoint once at module scope, happens here — after the containers exist
    // and after their addresses have reached the environment.
    const { getPlatformContainer } = await import("~/server/container.server");
    const { createApiRouteHandler } = await import("./api-routes");

    this.platformContainer = getPlatformContainer();
    this.routeHandler = await createApiRouteHandler(this.basePath());
  }

  override async stop(): Promise<void> {
    await this.platformContainer?.databasePool.end();
    this.platformContainer = null;
    this.routeHandler = null;

    if (this.storeAssetRoot) {
      await rm(this.storeAssetRoot, { force: true, recursive: true });
      this.storeAssetRoot = null;
    }

    await super.stop();
  }

  /** Calls the application the way the internet does. */
  async request(request: Request): Promise<Response> {
    if (!this.routeHandler) {
      throw new Error("Integration suite has not been started.");
    }

    const response = await this.routeHandler.queryRoute(request);

    if (!(response instanceof Response)) {
      throw new Error(`No route answered ${request.method} ${request.url}.`);
    }

    return response;
  }

  /** An application path, base path and all, as the browser would ask for it. */
  path(target: string): string {
    return `${this.basePath()}${target}`;
  }

  url(target: string): string {
    return `http://localhost${this.path(target)}`;
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

  /**
   * The mail that actually left the application, read back off the provider in
   * the order it arrived. Asserting here rather than on an in-process double
   * is what proves a send happened at all.
   */
  async sentEmails(): Promise<SentEmail[]> {
    const sends = await this.wireMock.recordedRequests(RESEND_EMAILS_PATH);

    return sends.map((send) => {
      const payload = JSON.parse(send.body) as {
        html: string;
        subject: string;
        text: string;
        to: string;
      };

      return {
        html: payload.html,
        idempotencyKey: send.headers["Idempotency-Key"] ?? null,
        subject: payload.subject,
        text: payload.text,
        to: payload.to,
      };
    });
  }

  /** The asset root is this suite's, so the application is told where it is. */
  protected override settings(): Record<string, string> {
    return {
      ...super.settings(),
      STORE_ASSET_ROOT: this.assetRoot(),
    };
  }

  private basePath(): string {
    return this.integrationTestEnvironment.runtimeEnvironment.APP_BASE_PATH;
  }
}
