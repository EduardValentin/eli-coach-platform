import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, rmSync, type WriteStream } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const platformDirectory = resolve(currentDirectory, "..");

/** The command a deployed container runs — see docker/Dockerfile.react-router. */
const SERVE_BINARY_PATH = "node_modules/@react-router/serve/bin.js";
const SERVER_BUILD_PATH = "build/server/index.js";
/**
 * The rig's wall-clock seam, loaded before a single application module is. It
 * is named here and nowhere else — no production script, Dockerfile or build
 * step passes it — so the deployed command stays exactly what the container
 * runs, plus a preload only a test rig can ask for.
 */
const SERVER_CLOCK_PRELOAD_URL = pathToFileURL(
  join(currentDirectory, "server-clock-preload.mjs"),
).href;

const READINESS_TIMEOUT_MS = 60_000;
const READINESS_POLL_INTERVAL_MS = 100;
const SHUTDOWN_GRACE_MS = 5_000;
/** Bounds the SIGKILL fallback itself, so stop() cannot hang forever behind
 * an OS that never delivers the "exit" event for a killed process. */
const FORCE_KILL_GRACE_MS = 5_000;
/** Enough to carry a stack trace and the requests around it into a failure. */
const RETAINED_OUTPUT_LINES = 60;
/** One retry only: a port collision right after `reserveFreePort` is a race
 * with another process, not a systemic failure worth looping on. */
const PORT_COLLISION_RETRY_LIMIT = 1;
/** A clock instruction is a single IPC message the child answers immediately;
 * anything slower means the child is gone or never loaded the preload. */
const CLOCK_ACKNOWLEDGEMENT_TIMEOUT_MS = 5_000;

type ProcessExit = {
  code: number | null;
  signal: NodeJS.Signals | null;
};

type ClockCommand =
  | { iso: string; type: "set-clock" }
  | { type: "reset-clock" };

type ClockAcknowledgement = {
  id: number;
  type: "clock-ack";
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
  private spawnError: Error | null = null;
  private logFilePath: string | null = null;
  private logStream: WriteStream | null = null;
  private port: number | null = null;
  private readonly retainedOutput: string[] = [];
  private readonly exitGuard = (): void => this.forceCleanupOnProcessExit();
  /** Correlates each clock instruction with the acknowledgement it awaits. */
  private lastClockCommandId = 0;

  constructor(private readonly options: PlatformServerOptions) {}

  async start(): Promise<void> {
    // A worker that dies (an uncaught rejection, a forced kill from the test
    // runner) must not leave the child process — or its mkdtemp log
    // directory — behind. `process.on("exit")` runs only synchronous work,
    // which is exactly what a best-effort SIGKILL and an `rmSync` are.
    process.on("exit", this.exitGuard);

    try {
      for (
        let attempt = 0;
        attempt <= PORT_COLLISION_RETRY_LIMIT;
        attempt += 1
      ) {
        const startedOnAPortThatWasStillFree =
          await this.spawnAndWaitUntilReady();

        if (startedOnAPortThatWasStillFree) {
          return;
        }
      }

      throw new Error(
        `The platform server could not bind a port after ${
          PORT_COLLISION_RETRY_LIMIT + 1
        } attempt(s).${this.describeOutput()}`,
      );
    } catch (error) {
      // start() failed, so stop() — the guard's usual removal point — will
      // never run. Drop the listener here instead of leaking one per failed
      // attempt across a test run.
      process.off("exit", this.exitGuard);
      throw error;
    }
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

  /**
   * Holds the application's wall clock at `instant`. Only `Date` moves — the
   * instance keeps serving on real timers — which is the out-of-process form
   * of `vi.useFakeTimers({ toFake: ["Date"] })`.
   */
  async setClock(instant: Date): Promise<void> {
    if (Number.isNaN(instant.getTime())) {
      throw new Error("The platform server cannot be set to an invalid date.");
    }

    await this.instructClock({ iso: instant.toISOString(), type: "set-clock" });
  }

  /** Hands the application back the real wall clock. */
  async resetClock(): Promise<void> {
    await this.instructClock({ type: "reset-clock" });
  }

  async stop(): Promise<void> {
    const child = this.child;

    this.child = null;

    if (child && this.exit === null) {
      child.kill("SIGTERM");
      await this.waitUntilStopped(child);
    }

    process.off("exit", this.exitGuard);
    this.logStream?.end();
    this.logStream = null;
    this.exit = null;
    this.spawnError = null;
    this.port = null;
  }

  /**
   * Spawns the child on a freshly reserved port and waits for readiness.
   * Returns `false` — instead of throwing — only for the one condition worth
   * retrying: the child exited immediately with output naming a port
   * collision, which means another process won the reservation race between
   * `reserveFreePort` returning and this process binding it.
   */
  private async spawnAndWaitUntilReady(): Promise<boolean> {
    this.port = await reserveFreePort();
    this.exit = null;
    this.spawnError = null;
    this.retainedOutput.length = 0;
    this.logFilePath = join(
      await mkdtemp(join(tmpdir(), "eli-coach-platform-integration-server-")),
      "server.log",
    );
    this.logStream = createWriteStream(this.logFilePath);

    this.child = spawn(
      process.execPath,
      [
        "--import",
        SERVER_CLOCK_PRELOAD_URL,
        SERVE_BINARY_PATH,
        SERVER_BUILD_PATH,
      ],
      {
        cwd: platformDirectory,
        env: { ...this.options.environment, PORT: String(this.port) },
        // The fourth slot is the IPC channel the clock seam listens on; the
        // application itself neither opens nor reads it.
        stdio: ["ignore", "pipe", "pipe", "ipc"],
      },
    );
    this.child.stdout?.on("data", (chunk: Buffer) => this.record(chunk));
    this.child.stderr?.on("data", (chunk: Buffer) => this.record(chunk));
    this.child.on("exit", (code, signal) => {
      this.exit = { code, signal };
    });
    // `spawn` itself never rejects — a bad binary path or a permissions
    // failure surfaces here instead, after the process has already been
    // handed back. Without this listener that failure is silent until the
    // 60s readiness timeout expires and reports a generic "not ready".
    this.child.on("error", (error) => {
      this.spawnError = error;
    });

    try {
      await this.waitUntilReady();

      return true;
    } catch (error) {
      if (this.isPortCollision()) {
        return false;
      }

      throw error;
    }
  }

  /**
   * Sends one clock instruction and waits for the child to say it applied it,
   * so a request made straight afterwards cannot race the change.
   */
  private async instructClock(command: ClockCommand): Promise<void> {
    const child = this.child;

    if (!child?.connected) {
      throw new Error(
        `The platform server is not running, so its clock cannot be changed (${command.type}).`,
      );
    }

    this.lastClockCommandId += 1;

    const id = this.lastClockCommandId;

    await new Promise<void>((resolveAcknowledgement, rejectAcknowledgement) => {
      const timeout = setTimeout(() => {
        settle();
        rejectAcknowledgement(
          new Error(
            `The platform server did not acknowledge ${command.type} within ${CLOCK_ACKNOWLEDGEMENT_TIMEOUT_MS}ms.${this.describeOutput()}`,
          ),
        );
      }, CLOCK_ACKNOWLEDGEMENT_TIMEOUT_MS);
      const onAcknowledgement = (message: unknown): void => {
        const acknowledgement = message as Partial<ClockAcknowledgement>;

        if (acknowledgement?.type !== "clock-ack" || acknowledgement.id !== id) {
          return;
        }

        settle();
        resolveAcknowledgement();
      };
      const settle = (): void => {
        clearTimeout(timeout);
        child.off("message", onAcknowledgement);
      };

      child.on("message", onAcknowledgement);
      child.send({ ...command, id }, (error) => {
        if (error) {
          settle();
          rejectAcknowledgement(error);
        }
      });
    });
  }

  private isPortCollision(): boolean {
    if (this.exit === null || this.exit.code === 0) {
      return false;
    }

    return /EADDRINUSE/i.test(this.retainedOutput.join("\n"));
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
      if (this.spawnError) {
        throw new Error(
          `The platform server failed to start: ${this.spawnError.message}.${this.describeOutput()}`,
          { cause: this.spawnError },
        );
      }

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
        `${this.origin()}${joinBasePath(this.options.basePath, "/readyz")}`,
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
      await this.waitUntilForceKilled();
    }
  }

  /**
   * SIGKILL cannot be caught, but the "exit" event that reports it is still
   * asynchronous, so stop() must wait for it rather than assume the process
   * is already gone the instant `kill` returns. Bounded so a stuck kernel
   * cannot hang the caller forever.
   */
  private async waitUntilForceKilled(): Promise<void> {
    const deadline = Date.now() + FORCE_KILL_GRACE_MS;

    while (this.exit === null && Date.now() < deadline) {
      await wait(READINESS_POLL_INTERVAL_MS);
    }

    if (this.exit === null) {
      throw new Error(
        `The platform server did not exit within ${FORCE_KILL_GRACE_MS}ms of SIGKILL.${this.describeOutput()}`,
      );
    }
  }

  /**
   * The `process.on("exit")` handler. Synchronous only — Node does not run
   * async work queued from this event — so this is a best-effort SIGKILL plus
   * an `rmSync` of the log directory, not the graceful path `stop()` takes.
   */
  private forceCleanupOnProcessExit(): void {
    if (this.child && this.exit === null) {
      this.child.kill("SIGKILL");
    }

    if (this.logFilePath) {
      rmSync(dirname(this.logFilePath), { force: true, recursive: true });
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
 * `basePath` is `/` at its shortest, so a bare concatenation with a
 * leading-slash suffix produces `//readyz`. Every deployed base path is
 * either `/` or a path with no trailing slash, so trimming a lone trailing
 * `/` off the base before joining is enough to keep the seam single-slash in
 * both cases.
 */
function joinBasePath(basePath: string, suffix: string): string {
  const trimmedBase = basePath === "/" ? "" : basePath;

  return `${trimmedBase}${suffix}`;
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
