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

export function clerkUserPath(authSubjectId: string): string {
  return `/v1/users/${authSubjectId}`;
}

type ClerkEmailAddressJson = {
  email_address: string;
  id: string;
  linked_to: never[];
  object: "email_address";
  verification: { status: string; strategy: string } | null;
};

// `EmailAddress.fromJSON` maps `linked_to` unguarded, so omitting it makes the
// SDK throw rather than answer.
function emailAddressJson(
  emailAddress: string,
  verificationStatus: string | null,
): ClerkEmailAddressJson {
  return {
    email_address: emailAddress,
    id: `idn_${emailAddress.replace(/[^a-z0-9]/gi, "")}`,
    linked_to: [],
    object: "email_address",
    verification: verificationStatus
      ? { status: verificationStatus, strategy: "email_code" }
      : null,
  };
}

function userJson(options: {
  authSubjectId: string;
  unverifiedEmails: readonly string[];
  verifiedEmails: readonly string[];
}) {
  const emailAddresses = [
    ...options.verifiedEmails.map((email) =>
      emailAddressJson(email, "verified"),
    ),
    ...options.unverifiedEmails.map((email) =>
      emailAddressJson(email, "unverified"),
    ),
  ];

  return {
    created_at: 1_700_000_000_000,
    email_addresses: emailAddresses,
    id: options.authSubjectId,
    object: "user",
    primary_email_address_id: emailAddresses[0]?.id ?? null,
    updated_at: 1_700_000_000_000,
  };
}

/** Lasts until the next reset, which restores the expectations below. */
export function clerkServesUser(options: {
  authSubjectId: string;
  unverifiedEmails?: readonly string[];
  verifiedEmails?: readonly string[];
}): WireMockStub {
  return {
    priority: 1,
    request: {
      method: "GET",
      urlPath: clerkUserPath(options.authSubjectId),
    },
    response: {
      headers: jsonHeaders,
      status: 200,
      jsonBody: userJson({
        authSubjectId: options.authSubjectId,
        unverifiedEmails: options.unverifiedEmails ?? [],
        verifiedEmails: options.verifiedEmails ?? [],
      }),
    },
  };
}

/** Lasts until the next reset, which restores the expectations below. */
export function clerkUserLookupFails(authSubjectId: string): WireMockStub {
  return {
    priority: 1,
    request: { method: "GET", urlPath: clerkUserPath(authSubjectId) },
    response: {
      headers: jsonHeaders,
      status: 500,
      jsonBody: {
        errors: [
          {
            code: "internal_server_error",
            message: "Internal server error",
          },
        ],
      },
    },
  };
}

// Identity is decided per case, so the suite-wide answer carries no address:
// linking claims nothing, and cases predating it stay unaffected.
const clerkServesAnySubjectWithoutEmail: WireMockStub = {
  priority: 10,
  request: { method: "GET", urlPathPattern: "/v1/users/[^/]+" },
  response: {
    headers: jsonHeaders,
    status: 200,
    jsonBody: userJson({
      authSubjectId: "user_integration",
      unverifiedEmails: [],
      verifiedEmails: [],
    }),
  },
};

export const clerkBackendApiStubs: readonly WireMockStub[] = [
  clerkServesTheSuiteSigningKey,
  clerkRevokesAnySession,
  clerkServesAnySubjectWithoutEmail,
];
