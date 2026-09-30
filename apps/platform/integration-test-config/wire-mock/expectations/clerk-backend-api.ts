import { clerkSigningJsonWebKey } from "../../clerk-session";

import type { WireMockStub } from "../wire-mock-container";

export const CLERK_JWKS_PATH = "/v1/jwks";
export const CLERK_INVITATIONS_PATH = "/v1/invitations";
export const CLERK_INVITATION_URL =
  "https://accounts.evoa.fit/sign-up?__clerk_ticket=integration_ticket";

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

const clerkCreatesInvitations: WireMockStub = {
  priority: 10,
  request: { method: "POST", urlPath: CLERK_INVITATIONS_PATH },
  response: {
    headers: jsonHeaders,
    status: 200,
    jsonBody: {
      created_at: 1_700_000_000_000,
      email_address: "invited@example.com",
      expires_at: 1_802_592_000_000,
      id: "inv_integration",
      object: "invitation",
      public_metadata: {},
      revoked: false,
      status: "pending",
      updated_at: 1_700_000_000_000,
      url: CLERK_INVITATION_URL,
    },
  },
};

export const clerkRefusesInvitations: WireMockStub = {
  priority: 1,
  request: { method: "POST", urlPath: CLERK_INVITATIONS_PATH },
  response: {
    headers: jsonHeaders,
    status: 500,
    jsonBody: {
      errors: [
        {
          code: "internal_clerk_error",
          long_message: "Something went wrong on Clerk's side.",
          message: "Something went wrong",
        },
      ],
    },
  },
};

const CLERK_INVITATION_REVOCATION_PATTERN = "/v1/invitations/[^/]+/revoke";

const clerkRevokesInvitations: WireMockStub = {
  priority: 10,
  request: {
    method: "POST",
    urlPathPattern: CLERK_INVITATION_REVOCATION_PATTERN,
  },
  response: {
    headers: jsonHeaders,
    status: 200,
    jsonBody: {
      created_at: 1_700_000_000_000,
      email_address: "invited@example.com",
      expires_at: 1_802_592_000_000,
      id: "inv_integration",
      object: "invitation",
      public_metadata: {},
      revoked: true,
      status: "revoked",
      updated_at: 1_700_000_100_000,
    },
  },
};

export const clerkRefusesInvitationRevocations: WireMockStub = {
  priority: 1,
  request: {
    method: "POST",
    urlPathPattern: CLERK_INVITATION_REVOCATION_PATTERN,
  },
  response: {
    headers: jsonHeaders,
    status: 500,
    jsonBody: {
      errors: [
        {
          code: "internal_clerk_error",
          long_message: "Something went wrong on Clerk's side.",
          message: "Something went wrong",
        },
      ],
    },
  },
};

export function clerkCreatesInvitation(invitationId: string): WireMockStub {
  return {
    priority: 5,
    request: { method: "POST", urlPath: CLERK_INVITATIONS_PATH },
    response: {
      headers: jsonHeaders,
      status: 200,
      jsonBody: {
        created_at: 1_700_000_000_000,
        email_address: "invited@example.com",
        expires_at: 1_802_592_000_000,
        id: invitationId,
        object: "invitation",
        public_metadata: {},
        revoked: false,
        status: "pending",
        updated_at: 1_700_000_000_000,
        url: CLERK_INVITATION_URL,
      },
    },
  };
}

export function clerkInvitationRevocationPath(invitationId: string): string {
  return `${CLERK_INVITATIONS_PATH}/${invitationId}/revoke`;
}

export function clerkServesUser(
  userId: string,
  publicMetadata: Record<string, unknown>,
): WireMockStub {
  return {
    request: { method: "GET", urlPath: `/v1/users/${userId}` },
    response: {
      headers: jsonHeaders,
      status: 200,
      jsonBody: {
        created_at: 1_700_000_000_000,
        email_addresses: [],
        id: userId,
        object: "user",
        private_metadata: {},
        public_metadata: publicMetadata,
        unsafe_metadata: {},
        updated_at: 1_700_000_000_000,
      },
    },
  };
}

export function clerkSessionRevocationPath(sessionId: string): string {
  return `/v1/sessions/${sessionId}/revoke`;
}

export const clerkBackendApiStubs: readonly WireMockStub[] = [
  clerkServesTheSuiteSigningKey,
  clerkRevokesAnySession,
  clerkCreatesInvitations,
  clerkRevokesInvitations,
];
