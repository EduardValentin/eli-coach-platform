import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { isPlaceholderValue } from "./env";
import { e2eDirectory } from "./repo-paths";

const RELAY_READY_TIMEOUT_MS = 60_000;
const runtimeDirectory = resolve(e2eDirectory, ".runtime");
// Fixed, not run-scoped: the run that leaked a listener is not around to name itself.
const pidFilePath = resolve(runtimeDirectory, "webhook-relay.pid");

/**
 * Clerk cannot reach localhost, so the CLI's listener dials out and forwards
 * deliveries back in — see docs/CLERK.md's "Local relay testing". A forged
 * delivery would prove nothing about the path a privacy request takes.
 *
 * Held in this module because globalSetup and globalTeardown share a process.
 */
let listener: ChildProcess | null = null;
let readyLineSeen = false;

type RelayLine = {
  type?: string;
};

function parseRelayLine(line: string): RelayLine | null {
  try {
    return JSON.parse(line) as RelayLine;
  } catch {
    // `--json` governs the CLI's output, not what a wrapper prints first.
    return null;
  }
}

function requireRelayToken(): string {
  const token = process.env.CLERK_WEBHOOK_RELAY_TOKEN;

  if (isPlaceholderValue(token)) {
    throw new Error(
      "CLERK_WEBHOOK_RELAY_TOKEN is missing or still a placeholder in the " +
        "repo root .env. global-setup.ts starts the Clerk webhook relay for " +
        "every run, so without it no journey can start — not only the " +
        "deleted-account one that needs a delivery. Mint a token with " +
        "`clerk webhooks token` and pair CLERK_WEBHOOK_SIGNING_SECRET with " +
        "the Dashboard endpoint registered against that token's inbox; see " +
        "docs/CLERK.md's E2E lane.",
    );
  }

  return token as string;
}

/**
 * Spawning detached is what lets this signal the CLI's process group, and also
 * what keeps Ctrl-C from reaching it — so a killed run leaves a listener
 * holding the inbox, and a second one would forward every delivery twice.
 * Matched by recorded pid, never by command line, so a listener a developer
 * started by hand is left alone.
 */
function reclaimLeakedListener(): void {
  if (!existsSync(pidFilePath)) {
    return;
  }

  const leakedPid = Number.parseInt(readFileSync(pidFilePath, "utf8"), 10);

  if (Number.isInteger(leakedPid)) {
    signalProcessGroup(leakedPid, "a listener leaked by an earlier run");
  }

  rmSync(pidFilePath, { force: true });
}

function signalProcessGroup(pid: number, describedAs: string): void {
  try {
    process.kill(-pid, "SIGTERM");
    console.log(`[e2e relay] stopped ${describedAs} (pid ${pid}).`);
  } catch (error) {
    // ESRCH is the ordinary "already gone"; anything else is worth seeing.
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
      console.error(
        `[e2e relay] could not stop ${describedAs} (pid ${pid}):`,
        (error as Error).message,
      );
    }
  }
}

export async function startWebhookRelay(): Promise<void> {
  const token = requireRelayToken();

  reclaimLeakedListener();

  const relay = spawn(
    "npx",
    [
      "-y",
      "clerk@latest",
      "webhooks",
      "listen",
      "--forward-to",
      "http://localhost:3000/api/clerk/webhooks",
      "--token",
      token,
      // Readiness is parsed from this stream, so ask for NDJSON rather than
      // relying on the human-facing banner already being JSON.
      "--json",
    ],
    { detached: true, stdio: ["ignore", "pipe", "pipe"] },
  );

  listener = relay;
  readyLineSeen = false;

  await new Promise<void>((resolve, reject) => {
    let pending = "";

    const failAfter = setTimeout(() => {
      stopWebhookRelay();
      reject(
        new Error(
          "The Clerk webhook relay did not report itself ready within " +
            `${RELAY_READY_TIMEOUT_MS / 1000}s. Check ` +
            "CLERK_WEBHOOK_RELAY_TOKEN in the repo root .env against " +
            "docs/CLERK.md's E2E lane.",
        ),
      );
    }, RELAY_READY_TIMEOUT_MS);

    const settleWith = (outcome: () => void) => {
      clearTimeout(failAfter);
      outcome();
    };

    relay.stdout?.on("data", (chunk: Buffer) => {
      // A line split across two `data` events would parse as nothing and be
      // dropped, leaving only the timeout to explain it.
      const lines = (pending + chunk.toString()).split("\n");
      pending = lines.pop() ?? "";

      for (const line of lines) {
        if (parseRelayLine(line)?.type === "ready") {
          readyLineSeen = true;
          rememberListener(relay.pid);
          settleWith(resolve);
        }
      }
    });

    relay.on("error", (error) => settleWith(() => reject(error)));
    relay.on("exit", (code) => {
      // The promise is settled by now, so rejecting is a no-op — and a relay
      // that dies mid-suite otherwise looks like a signing-secret mismatch.
      if (readyLineSeen) {
        console.error(
          `[e2e relay] the listener exited mid-run with code ${code}. Any ` +
            "journey waiting on a webhook delivery will time out.",
        );
        return;
      }

      settleWith(() =>
        reject(
          new Error(`The Clerk webhook relay exited with code ${code}.`),
        ),
      );
    });
  });
}

function rememberListener(pid: number | undefined): void {
  if (!pid) {
    return;
  }

  mkdirSync(runtimeDirectory, { recursive: true });
  writeFileSync(pidFilePath, String(pid));
}

export function stopWebhookRelay(): void {
  if (listener?.pid) {
    signalProcessGroup(listener.pid, "the webhook relay");
    listener.unref();
  }

  listener = null;
  readyLineSeen = false;
  rmSync(pidFilePath, { force: true });
}
