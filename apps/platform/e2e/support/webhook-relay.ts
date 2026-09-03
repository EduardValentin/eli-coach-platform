import { spawn, type ChildProcess } from "node:child_process";

import { requireRealEnv } from "./env";

const RELAY_READY_TIMEOUT_MS = 60_000;

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

type RelayLine = {
  type?: string;
};

function parseRelayLine(line: string): RelayLine | null {
  try {
    return JSON.parse(line) as RelayLine;
  } catch {
    // npx prints its own warnings before the listener says anything.
    return null;
  }
}

export async function startWebhookRelay(): Promise<void> {
  const token = requireRealEnv("CLERK_WEBHOOK_RELAY_TOKEN");
  // Detached so the whole process group can be signalled on the way out:
  // `npx` is a wrapper, and killing only it would leave the listener it
  // spawned holding the relay inbox open for the next run to collide with.
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
    ],
    { detached: true, stdio: ["ignore", "pipe", "pipe"] },
  );

  listener = relay;

  await new Promise<void>((resolve, reject) => {
    const failAfter = setTimeout(() => {
      stopWebhookRelay();
      reject(
        new Error(
          "The Clerk webhook relay did not report itself ready within " +
            `${RELAY_READY_TIMEOUT_MS / 1000}s. Check CLERK_WEBHOOK_RELAY_TOKEN ` +
            "in the repo root .env against docs/CLERK.md's E2E lane.",
        ),
      );
    }, RELAY_READY_TIMEOUT_MS);

    const settleWith = (outcome: () => void) => {
      clearTimeout(failAfter);
      outcome();
    };

    relay.stdout?.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split("\n")) {
        if (parseRelayLine(line)?.type === "ready") {
          settleWith(resolve);
        }
      }
    });

    relay.on("error", (error) => settleWith(() => reject(error)));
    relay.on("exit", (code) =>
      settleWith(() =>
        reject(
          new Error(`The Clerk webhook relay exited with code ${code}.`),
        ),
      ),
    );
  });
}

export function stopWebhookRelay(): void {
  if (!listener?.pid) {
    return;
  }

  try {
    process.kill(-listener.pid, "SIGTERM");
  } catch {
    // Already gone — nothing left to signal.
  }

  listener.unref();
  listener = null;
}
