import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { isPlaceholderValue } from "./env";
import { e2eDirectory } from "./repo-paths";

const RELAY_READY_TIMEOUT_MS = 60_000;
const runtimeDirectory = resolve(e2eDirectory, ".runtime");
// Fixed rather than run-scoped, unlike the Clerk-user registry beside it:
// there is only ever one listener per machine to reclaim, and the run that
// leaked it is by definition not around to name itself.
const pidFilePath = resolve(runtimeDirectory, "webhook-relay.pid");

/**
 * Clerk cannot deliver a webhook to a developer's localhost, so the CLI's
 * listener dials out to Clerk and forwards deliveries back in — see
 * docs/CLERK.md's "Local relay testing". A journey that needs the
 * application to learn something only Clerk knows (an identity was deleted)
 * has no other way to be driven end to end: without this, the delivery would
 * have to be forged locally, and a forged delivery proves nothing about the
 * path a real privacy request takes.
 *
 * The listener is held in this module rather than passed between hooks
 * because Playwright runs globalSetup and globalTeardown in the same runner
 * process — the same reason run-id.ts can hand its id over through the
 * environment.
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
    // Not every line is a relay event — `--json` governs this CLI's own
    // output, not whatever a wrapper decides to print first.
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
 * Kills a listener a previous run left behind. Spawning detached is what lets
 * this module signal the CLI's whole process group on the way out, and it is
 * also what stops a terminal's Ctrl-C from reaching it — so a run killed
 * outright leaves the listener alive, still holding this token's inbox. A
 * second listener on the same token would then forward every delivery twice.
 * The pid is recorded rather than matched by command line so this only ever
 * reclaims a listener this suite started, never one a developer is running by
 * hand alongside it.
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
    // ESRCH simply means it is already gone, which is the ordinary case for a
    // clean run. Anything else is worth seeing rather than swallowing.
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
      // The documented machine-readable mode. Readiness is detected by
      // parsing this stream, so asking for NDJSON explicitly keeps a future
      // change to the CLI's human-facing banner from breaking it silently.
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
      // A JSON object split across two `data` events would fail to parse and
      // be dropped, leaving only the timeout above to explain it — so hold
      // the trailing partial line until the rest arrives.
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
      // After startup the promise is long settled, so rejecting is a no-op —
      // and a relay that dies mid-suite would otherwise be indistinguishable
      // from a signing-secret mismatch when a journey's wait times out.
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
