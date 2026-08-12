import type { WireMockStub } from "../wire-mock-container";

export const RESEND_EMAILS_PATH = "/emails";

/** Resend answers an accepted send with the message identifier it assigned. */
export const resendEmails: WireMockStub = {
  request: { method: "POST", urlPath: RESEND_EMAILS_PATH },
  response: {
    status: 200,
    jsonBody: { id: "6229f547-f3b1-4c1a-9f3a-1c0c2b3d4e5f" },
  },
};
