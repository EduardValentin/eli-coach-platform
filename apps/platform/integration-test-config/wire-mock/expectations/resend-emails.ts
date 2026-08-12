import type { WireMockStub } from "../wire-mock-container";

export const RESEND_EMAILS_PATH = "/emails";

const jsonHeaders = { "Content-Type": "application/json" };

/** Resend answers an accepted send with the message identifier it assigned. */
export const resendEmails: WireMockStub = {
  priority: 10,
  request: { method: "POST", urlPath: RESEND_EMAILS_PATH },
  response: {
    headers: jsonHeaders,
    status: 200,
    jsonBody: { id: "6229f547-f3b1-4c1a-9f3a-1c0c2b3d4e5f" },
  },
};

/**
 * Every send carries the idempotency key of the request that caused it, so a
 * test arranging a provider failure names the one send it wants refused
 * instead of poisoning the address for the rest of the case.
 *
 * The header holds the provider's key, which the delivery service derives from
 * the application's. Matching on a substring lets a test name the request by
 * the key it submitted without restating how that derivation works.
 */
function forDelivery(idempotencyKey: string): WireMockStub["request"] {
  return {
    headers: { "Idempotency-Key": { contains: idempotencyKey } },
    method: "POST",
    urlPath: RESEND_EMAILS_PATH,
  };
}

/** Resend refuses a send it will never make: the address is unusable. */
export function resendRejects(idempotencyKey: string): WireMockStub {
  return {
    priority: 1,
    request: forDelivery(idempotencyKey),
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

/** Resend fails without saying whether the send happened. */
export function resendFailsWithoutVerdict(idempotencyKey: string): WireMockStub {
  return {
    priority: 1,
    request: forDelivery(idempotencyKey),
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
