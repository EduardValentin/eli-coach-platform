import {
  GenericContainer,
  Wait,
  type StartedTestContainer,
} from "testcontainers";

import { IntegrationTestContainer } from "../integration-test-container";

const WIRE_MOCK_IMAGE = "wiremock/wiremock:3.9.1";
const WIRE_MOCK_PORT = 8080;

export type WireMockMatcher =
  | { contains: string }
  | { equalTo: string }
  | { matches: string };

export type WireMockStub = {
  /** Lower wins. Leave unset for the general case a specific stub overrides. */
  priority?: number;
  request: {
    bodyPatterns?: WireMockMatcher[];
    formParameters?: Record<string, WireMockMatcher>;
    headers?: Record<string, WireMockMatcher>;
    method: string;
    urlPath?: string;
    urlPathPattern?: string;
  };
  response: {
    status: number;
    jsonBody?: unknown;
    headers?: Record<string, string>;
  };
};

export type RecordedRequest = {
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
  loggedDate: number;
};

/**
 * Runs the third parties this application talks to as one container serving
 * their documented contracts, so the real adapters make real HTTP calls and a
 * test can assert what each service actually received.
 */
export class WireMockContainer extends IntegrationTestContainer {
  private container: StartedTestContainer | null = null;
  private readonly stubs: readonly WireMockStub[];

  constructor(stubs: readonly WireMockStub[]) {
    super();
    this.stubs = stubs;
  }

  async start(): Promise<void> {
    this.container = await new GenericContainer(WIRE_MOCK_IMAGE)
      .withExposedPorts(WIRE_MOCK_PORT)
      .withCommand(["--disable-banner"])
      .withWaitStrategy(Wait.forHttp("/__admin/health", WIRE_MOCK_PORT))
      .start();
    await this.applyStubs();
  }

  async reset(): Promise<void> {
    await this.admin("DELETE", "/__admin/requests");
    await this.admin("POST", "/__admin/mappings/reset");
    await this.applyStubs();
  }

  async stop(): Promise<void> {
    await this.container?.stop();
    this.container = null;
  }

  /** How the application is told to reach these services. */
  settings(): Record<string, string> {
    return {
      RESEND_BASE_URL: this.baseUrl(),
      TURNSTILE_SITEVERIFY_URL: `${this.baseUrl()}/turnstile/v0/siteverify`,
    };
  }

  /**
   * Adds one more answer for the scenario a test is arranging — an address the
   * provider refuses, say. It lasts until the next reset, which restores the
   * suite's own expectations.
   */
  async stub(stub: WireMockStub): Promise<void> {
    await this.admin("POST", "/__admin/mappings", stub);
  }

  async recordedRequests(urlPath: string): Promise<RecordedRequest[]> {
    const found = (await this.admin("POST", "/__admin/requests/find", {
      urlPath,
    })) as { requests: RecordedRequest[] };

    // The journal already answers oldest first, and this sort is stable, so
    // two requests logged in the same millisecond keep that order rather than
    // being shuffled by a tie.
    return [...found.requests].sort(
      (earlier, later) => earlier.loggedDate - later.loggedDate,
    );
  }

  baseUrl(): string {
    if (!this.container) {
      throw new Error("WireMock container has not been started.");
    }

    return `http://${this.container.getHost()}:${this.container.getMappedPort(
      WIRE_MOCK_PORT,
    )}`;
  }

  private async applyStubs(): Promise<void> {
    for (const stub of this.stubs) {
      await this.stub(stub);
    }
  }

  private async admin(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const response = await fetch(`${this.baseUrl()}${path}`, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method,
    });

    if (!response.ok) {
      throw new Error(
        `WireMock admin ${method} ${path} failed with ${response.status}.`,
      );
    }

    // Several admin endpoints acknowledge with an empty body rather than JSON.
    const payload = await response.text();

    return payload ? (JSON.parse(payload) as unknown) : null;
  }
}
