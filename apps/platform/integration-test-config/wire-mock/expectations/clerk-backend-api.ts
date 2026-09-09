import { clerkSigningJsonWebKey } from "../../clerk-session";

import type { WireMockStub } from "../wire-mock-container";

export const CLERK_JWKS_PATH = "/v1/jwks";

const jsonHeaders = { "Content-Type": "application/json" };

/** What the Clerk Backend API answers when an SDK fetches signing keys. */
const clerkServesTheSuiteSigningKey: WireMockStub = {
  request: { method: "GET", urlPath: CLERK_JWKS_PATH },
  response: {
    headers: jsonHeaders,
    status: 200,
    jsonBody: { keys: [clerkSigningJsonWebKey()] },
  },
};

// Revoking answers with the session it revoked. Which session that was is
// asserted from WireMock's request journal, not from this body — the caller
// discards it, so it stands only for the shape Clerk returns.
const clerkRevokesAnySession: WireMockStub = {
  request: { method: "POST", urlPathPattern: "/v1/sessions/[^/]+/revoke" },
  response: {
    headers: jsonHeaders,
    status: 200,
    jsonBody: {
      abandon_at: 1_800_000_000_000,
      client_id: "client_integration",
      created_at: 1_700_000_000_000,
      expire_at: 1_800_000_000_000,
      id: "sess_revoked",
      last_active_at: 1_700_000_000_000,
      object: "session",
      status: "revoked",
      updated_at: 1_700_000_000_000,
      user_id: "user_integration",
    },
  },
};

export function clerkSessionRevocationPath(sessionId: string): string {
  return `/v1/sessions/${sessionId}/revoke`;
}

export const clerkBackendApiStubs: readonly WireMockStub[] = [
  clerkServesTheSuiteSigningKey,
  clerkRevokesAnySession,
];
