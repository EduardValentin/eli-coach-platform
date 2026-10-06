import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { COACH_NOTIFICATION_EMAIL } from "./email-capture";
import { webServerLaunchFor } from "./web-server";

const PROBLEM = "The repo root .env.e2e is missing.";

describe("webServerLaunchFor", () => {
  it("fails the web server start with the environment problem on stderr", () => {
    // arrange
    const launch = webServerLaunchFor({ problem: PROBLEM });

    // act
    const run = spawnSync(launch.command, {
      encoding: "utf8",
      env: { ...process.env, ...launch.env },
      shell: true,
    });

    // assert
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain(PROBLEM);
  });

  it("sends the coach's notifications to the address the email capture answers for", () => {
    // arrange
    const environment = {
      secretKey: "sk_test_e2e",
      webhookSigningSecret: "whsec_e2e",
    };

    // act
    const launch = webServerLaunchFor({ environment });

    // assert
    expect(launch.env.ASSESSMENT_CALL_COACH_EMAIL).toBe(
      COACH_NOTIFICATION_EMAIL,
    );
  });

  it("starts the dev server with the Stripe test keys when the environment is ready", () => {
    // arrange
    const environment = {
      secretKey: "sk_test_e2e",
      webhookSigningSecret: "whsec_e2e",
    };

    // act
    const launch = webServerLaunchFor({ environment });

    // assert
    expect(launch.command).toBe("pnpm dev:e2e");
    expect(launch.env).toMatchObject({
      STRIPE_SECRET_KEY: "sk_test_e2e",
      STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_e2e",
    });
  });
});
