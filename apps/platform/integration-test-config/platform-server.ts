import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, type WriteStream } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const platformDirectory = resolve(currentDirectory, "..");

/** The command a deployed container runs — see docker/Dockerfile.react-router. */
const SERVE_BINARY_PATH = "node_modules/@react-router/serve/bin.js";
const SERVER_BUILD_PATH = "build/server/index.js";

const READINESS_TIMEOUT_MS = 60_000;
const READINESS_POLL_INTERVAL_MS = 100;
const SHUTDOWN_GRACE_MS = 5_000;
/** Enough to carry a stack trace and the requests around it into a failure. */
const RETAINED_OUTPUT_LINES = 60;

type ProcessExit = {
  code: number | null;
  signal: NodeJS.Signals | null;
};

export type PlatformServerOptions = {
  /** Where the router's basename puts every route, `/readyz` included. */
  basePath: string;
  /** Complete at spawn: a deployed instance never learns anything later. */
  environment: NodeJS.ProcessEnv;
};

/**
 * The application as it is deployed: the production build, served by the same
 * binary the container's CMD names, in its own process, reached over HTTP.
 * Nothing here imports the application, so nothing here can assemble a version
 * of it that no deployment would produce.
 */
export class PlatformServer {
  private child: ChildProcess | null = null;
  private exit: ProcessExit | null = null;
  private logFilePath: string | null = null;
  private logStream: WriteStream | null = null;
  private port: number | null = null;
  private readonly retainedOutput: string[] = [];

  constructor(private readonly options: PlatformServerOptions) {}

  async start(): Promise<void> {
    this.port = await reserveFreePort();
    this.logFilePath = join(
      await mkdtemp(join(tmpdir(), "eli-coach-platform-integration-server-")),
      "server.log",
    );
    this.logStream = createWriteStream(this.logFilePath);

    this.child = spawn(
      process.execPath,
      [SERVE_BINARY_PATH, SERVER_BUILD_PATH],
      {
        cwd: platformDirectory,
        env: { ...this.options.environment, PORT: String(this.port) },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    this.child.stdout?.on("data", (chunk: Buffer) => this.record(chunk));
    this.child.stderr?.on("data", (chunk: Buffer) => this.record(chunk));
    this.child.on("exit", (code, signal) => {
      this.exit = { code, signal };
    });

    await this.waitUntilReady();
  }

  /**
   * The same request, over the wire. Only the origin is replaced: a suite
   * addresses the application by the base path it is deployed under, and the
   * port it happened to be given is not part of what a test is describing.
   *
   * Redirects are not followed, so a redirect stays an assertable answer
   * rather than becoming whatever it points at.
   */
  async send(request: Request): Promise<Response> {
    const target = new URL(request.url);
    const carriesABody = request.method !== "GET" && request.method !== "HEAD";

    try {
      return await fetch(
        `${this.origin()}${target.pathname}${target.search}`,
        {
          body: carriesABody ? await request.arrayBuffer() : undefined,
          headers: request.headers,
          method: request.method,
          redirect: "manual",
        },
      );
    } catch (error) {
      throw new Error(
        `The platform server did not answer ${request.method} ${target.pathname}.${this.describeOutput()}`,
        { cause: error },
      );
    }
  }

  async stop(): Promise<void> {
    const child = this.child;

    this.child = null;

    if (child && this.exit === null) {
      child.kill("SIGTERM");
      await this.waitUntilStopped(child);
    }

    this.logStream?.end();
    this.logStream = null;
    this.exit = null;
    this.port = null;
  }

  private origin(): string {
    if (this.port === null) {
      throw new Error("The platform server has not been started.");
    }

    return `http://127.0.0.1:${this.port}`;
  }

  private async waitUntilReady(): Promise<void> {
    const deadline = Date.now() + READINESS_TIMEOUT_MS;

    while (Date.now() < deadline) {
      if (this.exit) {
        throw new Error(
          `The platform server exited before it was ready (${describeExit(this.exit)}).${this.describeOutput()}`,
        );
      }

      // Readiness is the application's own answer about its dependencies, so
      // waiting for it is waiting for the database to be reachable too.
      const status = await this.probeReadiness();

      if (status === 200) {
        return;
      }

      await wait(READINESS_POLL_INTERVAL_MS);
    }

    throw new Error(
      `The platform server was still not ready after ${READINESS_TIMEOUT_MS}ms.${this.describeOutput()}`,
    );
  }

  private async probeReadiness(): Promise<number | null> {
    try {
      const response = await fetch(
        `${this.origin()}${this.options.basePath}/readyz`,
      );

      return response.status;
    } catch {
      // Not listening yet.
      return null;
    }
  }

  private async waitUntilStopped(child: ChildProcess): Promise<void> {
    const deadline = Date.now() + SHUTDOWN_GRACE_MS;

    // The server closes its listener on SIGTERM but waits for open keep-alive
    // connections, which the suite's own client holds — hence the deadline.
    while (this.exit === null && Date.now() < deadline) {
      await wait(READINESS_POLL_INTERVAL_MS);
    }

    if (this.exit === null) {
      child.kill("SIGKILL");
    }
  }

  private record(chunk: Buffer): void {
    const output = chunk.toString();

    this.logStream?.write(output);
    this.retainedOutput.push(...output.split("\n"));
    this.retainedOutput.splice(
      0,
      Math.max(this.retainedOutput.length - RETAINED_OUTPUT_LINES, 0),
    );
  }

  private describeOutput(): string {
    const tail = this.retainedOutput
      .filter((line) => line.trim().length > 0)
      .join("\n");

    return `\n\nLast lines of ${this.logFilePath}:\n${tail}`;
  }
}

function describeExit(exit: ProcessExit): string {
  return exit.signal ? `signal ${exit.signal}` : `code ${exit.code}`;
}

/**
 * Suites run in separate processes and must not collide on a port. The kernel
 * hands out a free one, and it is released again immediately — nothing else
 * asks for an ephemeral port in the moment between here and the spawn.
 */
async function reserveFreePort(): Promise<number> {
  return new Promise((resolvePort, rejectPort) => {
    const probe = createServer();

    probe.on("error", rejectPort);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();

      if (address === null || typeof address === "string") {
        probe.close(() => rejectPort(new Error("No port was assigned.")));

        return;
      }

      probe.close(() => resolvePort(address.port));
    });
  });
}
