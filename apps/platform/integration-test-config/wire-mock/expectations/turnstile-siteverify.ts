import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { STORE_ACQUISITION_TURNSTILE_ACTION } from "@eli-coach-platform/infrastructure/bot-detection";

import type { WireMockStub } from "../wire-mock-container";

export const TURNSTILE_SITEVERIFY_PATH = "/turnstile/v0/siteverify";
export const TURNSTILE_STUBBED_TOKEN = TURNSTILE_TEST_RESPONSE_TOKEN;

/**
 * Cloudflare reports the action the widget was configured with, and the
 * verifier rejects a submission whose action does not match.
 *
 * The action travels inside the token rather than in the request, so one
 * endpoint cannot yet answer for every entry point: this stub speaks for store
 * acquisition. Serving the waitlist action too needs the stubs keyed by token,
 * which is the next step here.
 */
export const turnstileSiteverify: WireMockStub = {
  request: { method: "POST", urlPath: TURNSTILE_SITEVERIFY_PATH },
  response: {
    status: 200,
    jsonBody: {
      action: STORE_ACQUISITION_TURNSTILE_ACTION,
      "challenge_ts": "2026-07-30T12:00:00.000Z",
      "error-codes": [],
      hostname: "localhost",
      success: true,
    },
  },
};
