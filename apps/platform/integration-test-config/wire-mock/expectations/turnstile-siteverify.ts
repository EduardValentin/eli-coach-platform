import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import {
  STORE_ACQUISITION_TURNSTILE_ACTION,
  WAITLIST_TURNSTILE_ACTION,
} from "@eli-coach-platform/infrastructure/bot-detection";

import type { WireMockStub } from "../wire-mock-container";

export const TURNSTILE_SITEVERIFY_PATH = "/turnstile/v0/siteverify";

const VERIFIED_ACTIONS = [
  STORE_ACQUISITION_TURNSTILE_ACTION,
  WAITLIST_TURNSTILE_ACTION,
];

/**
 * A token stands for the widget that issued it, and every widget is configured
 * with one action. Cloudflare reports that action back on verification, which
 * is what lets the verifier reject a token minted for a different form.
 */
export function turnstileTokenForAction(action: string): string {
  return `${TURNSTILE_TEST_RESPONSE_TOKEN}.${action}`;
}

const jsonHeaders = { "Content-Type": "application/json" };

const verifiedSubmissions: WireMockStub[] = VERIFIED_ACTIONS.map((action) => ({
  priority: 1,
  request: {
    formParameters: {
      response: { equalTo: turnstileTokenForAction(action) },
    },
    method: "POST",
    urlPath: TURNSTILE_SITEVERIFY_PATH,
  },
  response: {
    headers: jsonHeaders,
    status: 200,
    jsonBody: {
      action,
      "challenge_ts": "2026-07-30T12:00:00.000Z",
      "error-codes": [],
      hostname: "localhost",
      success: true,
    },
  },
}));

/** Any other token was never issued here, which is what Cloudflare reports. */
const unissuedToken: WireMockStub = {
  priority: 10,
  request: { method: "POST", urlPath: TURNSTILE_SITEVERIFY_PATH },
  response: {
    headers: jsonHeaders,
    status: 200,
    jsonBody: {
      "error-codes": ["invalid-input-response"],
      success: false,
    },
  },
};

export const turnstileSiteverifyStubs: readonly WireMockStub[] = [
  ...verifiedSubmissions,
  unissuedToken,
];
