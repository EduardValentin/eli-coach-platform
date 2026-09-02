import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { IntegrationTestSuite } from "./integration-test-suite";
import { PlatformServer } from "./platform-server";
import { PostgresContainer } from "./postgres-container";
import { loadIntegrationTestEnvironment } from "./runtime-environment";
import { WireMockContainer } from "./wire-mock/wire-mock-container";
import { clerkBackendApiStubs } from "./wire-mock/expectations/clerk-backend-api";
import {
  RESEND_EMAILS_PATH,
  resendAcceptsEveryEmail,
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
 * Nothing here assembles the application. The suite starts the containers,
 * tells a real instance of the production build where each one can be reached,
 * and then talks to it over HTTP — exactly as a deployed instance is
 * configured and exactly as a browser or a webhook sender reaches it.
 */
export class ApiIntegrationTestSuite extends IntegrationTestSuite {
  readonly postgres = new PostgresContainer();
  readonly wireMock = new WireMockContainer([
    ...clerkBackendApiStubs,
    resendAcceptsEveryEmail,
    ...turnstileSiteverifyStubs,
  ]);
  protected readonly containers = [this.postgres, this.wireMock];

  private readonly integrationTestEnvironment = loadIntegrationTestEnvironment();
  private server: PlatformServer | null = null;
  private storeAssetRoot: string | null = null;

  override async start(): Promise<void> {
    this.storeAssetRoot = await mkdtemp(
      join(tmpdir(), "eli-coach-store-assets-integration-"),
    );
    await super.start();

    this.server = new PlatformServer({
      basePath: this.basePath(),
      // Complete at spawn, containers included: the instance reads its
      // configuration once, when it starts, and nothing reaches inside it
      // afterwards.
      environment: { ...process.env, ...this.settings() },
    });
    await this.server.start();
  }

  /**
   * A frozen clock is state like any other, so it is released with the rest of
   * it between cases — a case that never touches the clock always finds the
   * real one.
   */
  override async reset(): Promise<void> {
    try {
      await this.server?.resetClock();
    } finally {
      await super.reset();
    }
  }

  override async stop(): Promise<void> {
    await this.server?.stop();
    this.server = null;

    if (this.storeAssetRoot) {
      await rm(this.storeAssetRoot, { force: true, recursive: true });
      this.storeAssetRoot = null;
    }

    await super.stop();
  }

  async request(request: Request): Promise<Response> {
    return this.requireServer().send(request);
  }

  /**
   * Holds the running instance's wall clock at `instant` until the case ends.
   * The application reads `new Date()` in its own process, so this is where a
   * case says what "now" is for it — the out-of-process equivalent of
   * `vi.useFakeTimers({ toFake: ["Date"] })`. Only `Date` is affected: the
   * instance keeps serving, and every other real input stays real.
   */
  async setServerClock(instant: Date): Promise<void> {
    await this.requireServer().setClock(instant);
  }

  path(target: string): string {
    return `${this.basePath()}${target}`;
  }

  url(target: string): string {
    return `http://localhost${this.path(target)}`;
  }

  assetRoot(): string {
    if (!this.storeAssetRoot) {
      throw new Error("Integration suite has not been started.");
    }

    return this.storeAssetRoot;
  }

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

  protected override settings(): Record<string, string> {
    return {
      ...super.settings(),
      STORE_ASSET_ROOT: this.assetRoot(),
    };
  }

  private basePath(): string {
    return this.integrationTestEnvironment.runtimeEnvironment.APP_BASE_PATH;
  }

  private requireServer(): PlatformServer {
    if (!this.server) {
      throw new Error("Integration suite has not been started.");
    }

    return this.server;
  }
}
