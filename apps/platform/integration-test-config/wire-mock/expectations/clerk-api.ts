import type { WireMockStub } from "../wire-mock-container";

/**
 * Clerk's backend SDK loads verification keys from `{apiUrl}/v1/jwks` with the
 * secret key as a bearer token, so serving that one endpoint is enough for the
 * real adapter to verify a real signature.
 */
export function clerkServesJwks(jwk: unknown): WireMockStub {
  return {
    request: { method: "GET", urlPath: "/v1/jwks" },
    response: { status: 200, jsonBody: { keys: [jwk] } },
  };
}

export function clerkRevokesSessions(): WireMockStub {
  return {
    request: { method: "POST", urlPathPattern: "/v1/sessions/[^/]+/revoke" },
    response: { status: 200, jsonBody: { object: "session", status: "revoked" } },
  };
}

/**
 * What Clerk answers once the user behind a session is gone — the deleted-account
 * path exactly. Also stands in for any transient refusal, which is certain to
 * happen eventually.
 */
export function clerkRefusesSessionRevocation(sessionId: string): WireMockStub {
  return {
    priority: 1,
    request: { method: "POST", urlPath: `/v1/sessions/${sessionId}/revoke` },
    response: {
      status: 404,
      jsonBody: { errors: [{ code: "resource_not_found", message: "Not Found" }] },
    },
  };
}
