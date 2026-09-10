import type { APIRequestContext } from "@playwright/test";

import { requireEnv } from "./env";

// A publishable key is the Frontend API host, base64-encoded with a trailing
// `$`, behind a `pk_test_`/`pk_live_` prefix.
function frontendApiHost(publishableKey: string): string {
  return Buffer.from(publishableKey.replace(/^pk_(test|live)_/, ""), "base64")
    .toString("utf8")
    .replace(/\$$/, "");
}

export async function readClerkSignUpMode(request: APIRequestContext): Promise<string> {
  const environment = await request.get(
    `https://${frontendApiHost(requireEnv("CLERK_PUBLISHABLE_KEY"))}/v1/environment`,
  );
  const body = (await environment.json()) as {
    user_settings: { sign_up: { mode: string } };
  };

  return body.user_settings.sign_up.mode;
}
