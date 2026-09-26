import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import { describe, expect, it, vi } from "vitest";

import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { PaymentLinksController } from "./payment-links-controller.server";

const CALL_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

type Session =
  { kind: "anonymous" } | { account: AccountSnapshot; kind: "authenticated" };

describe("PaymentLinksController", () => {
  it("refuses an anonymous caller with 401 and sends nothing", async () => {
    // arrange
    const { controller, execute } = createController({ status: "sent" });

    // act
    const thrown = await captureThrown(() =>
      controller.sendPaymentLink(sendArgs({ session: { kind: "anonymous" } })),
    );

    // assert
    expect((thrown as Response).status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });

  it("refuses a client account with 403 and sends nothing", async () => {
    // arrange
    const { controller, execute } = createController({ status: "sent" });

    // act
    const thrown = await captureThrown(() =>
      controller.sendPaymentLink(
        sendArgs({ session: authenticatedAs("CLIENT") }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(execute).not.toHaveBeenCalled();
  });

  it("answers 400 and sends nothing when the call id is not a uuid", async () => {
    // arrange
    const { controller, execute } = createController({ status: "sent" });

    // act
    const response = await controller.sendPaymentLink(
      sendArgs({ body: JSON.stringify({ assessmentCallId: "call-1" }) }),
    );

    // assert
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("answers 400 and sends nothing when the body is not JSON", async () => {
    // arrange
    const { controller, execute } = createController({ status: "sent" });

    // act
    const response = await controller.sendPaymentLink(
      sendArgs({ body: "assessmentCallId=call-1" }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });

  it("sends the link for the named call and answers 200 with the address it went to", async () => {
    // arrange
    const { controller, execute } = createController({
      email: "ana@example.com",
      status: "sent",
    });

    // act
    const response = await controller.sendPaymentLink(sendArgs({}));

    // assert
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      email: "ana@example.com",
      status: "sent",
    });
    expect(execute).toHaveBeenCalledWith({ assessmentCallId: CALL_ID });
  });

  it.each([
    ["closed", 404],
    ["call_not_found", 404],
    ["call_not_ended", 409],
    ["already_paid", 409],
    ["delivery_failed", 502],
  ] as const)(
    "answers the %s refusal with %i and names it",
    async (status, httpStatus) => {
      // arrange
      const { controller } = createController({ status });

      // act
      const response = await controller.sendPaymentLink(sendArgs({}));

      // assert
      expect(response.status).toBe(httpStatus);
      await expect(response.json()).resolves.toEqual({ error: status });
    },
  );
});

function createController(result: unknown) {
  const execute = vi.fn().mockResolvedValue(result);
  const controller = new PaymentLinksController({
    sendPaymentLink: { execute } as never,
  });

  return { controller, execute };
}

function sendArgs(options: { body?: string; session?: Session }) {
  return createRequestArgs({
    contexts: [
      contextEntry(sessionContext, options.session ?? authenticatedAs("COACH")),
    ],
    request: new Request("https://evoa.test/api/coaching-sales/payment-links", {
      body: options.body ?? JSON.stringify({ assessmentCallId: CALL_ID }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  });
}

function authenticatedAs(role: AccountSnapshot["role"]): Session {
  return {
    account: { authSubjectId: "user_1", id: "acct_1", role },
    kind: "authenticated",
  };
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
  } catch (error) {
    return error;
  }

  throw new Error("Expected the call to throw.");
}
