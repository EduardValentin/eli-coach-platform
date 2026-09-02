import type { WireMockStub } from "../wire-mock-container";

export const RESEND_EMAILS_PATH = "/emails";

const jsonHeaders = { "Content-Type": "application/json" };

export const resendAcceptsEveryEmail: WireMockStub = {
  priority: 10,
  request: { method: "POST", urlPath: RESEND_EMAILS_PATH },
  response: {
    headers: jsonHeaders,
    status: 200,
    jsonBody: { id: "6229f547-f3b1-4c1a-9f3a-1c0c2b3d4e5f" },
  },
};

/**
 * Rejects any send, for callers whose sends carry no application idempotency
 * key to name them by — the client invitation deliberately sends without one.
 */
export const resendRejectsEveryEmail: WireMockStub = {
  priority: 1,
  request: { method: "POST", urlPath: RESEND_EMAILS_PATH },
  response: {
    headers: jsonHeaders,
    status: 400,
    jsonBody: {
      message: "The `to` address is invalid.",
      name: "validation_error",
      statusCode: 400,
    },
  },
};

export function resendRejects(applicationIdempotencyKey: string): WireMockStub {
  return {
    priority: 1,
    request: theSendCausedBy(applicationIdempotencyKey),
    response: {
      headers: jsonHeaders,
      status: 400,
      jsonBody: {
        message: "The `to` address is invalid.",
        name: "validation_error",
        statusCode: 400,
      },
    },
  };
}

export function resendFailsWithoutVerdict(
  applicationIdempotencyKey: string,
): WireMockStub {
  return {
    priority: 1,
    request: theSendCausedBy(applicationIdempotencyKey),
    response: {
      headers: jsonHeaders,
      status: 500,
      jsonBody: {
        message: "Internal server error.",
        name: "application_error",
        statusCode: 500,
      },
    },
  };
}

/**
 * The header holds the provider's key, which the delivery service derives from
 * the application's, so a substring is what lets a test name a send by the key
 * it submitted without restating that derivation.
 */
function theSendCausedBy(
  applicationIdempotencyKey: string,
): WireMockStub["request"] {
  return {
    headers: { "Idempotency-Key": { contains: applicationIdempotencyKey } },
    method: "POST",
    urlPath: RESEND_EMAILS_PATH,
  };
}
