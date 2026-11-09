import { describe, expect, it, vi } from "vitest";

import type {
  DeliverOrderEmailUseCase,
  OrderEmailDelivery,
  PrepareOrderEmailResendResult,
  PrepareOrderEmailResendUseCase,
  ReadOrderConfirmationResult,
  ReadOrderConfirmationUseCase,
} from "~/bounded-contexts/sales/store/domain/order";

import { StoreOrderController } from "./store-order-controller.server";

const SESSION_ID = "cs_test_order";
const confirmation = {
  email: "woman@example.com",
  currency: "EUR" as const,
  lines: [
    { title: "30-Day Fat Loss Plan", amountMinorUnits: 3900 },
    { title: "Hormone Harmony E-Book", amountMinorUnits: null },
  ],
  totalMinorUnits: 3900,
  termsVersion: "1.0",
};

function createController(options: {
  read?: ReadOrderConfirmationResult;
  prepared?: PrepareOrderEmailResendResult;
  delivered?: "sent" | "not_sent";
}) {
  const readExecute = vi
    .fn()
    .mockResolvedValue(options.read ?? { status: "not_completed" });
  const prepareExecute = vi
    .fn()
    .mockResolvedValue(options.prepared ?? { status: "not_found" });
  const deliverExecute = vi.fn().mockResolvedValue(options.delivered ?? "sent");
  const storeOrderController = new StoreOrderController({
    readOrderConfirmationUseCase: {
      execute: readExecute,
    } as unknown as ReadOrderConfirmationUseCase,
    prepareOrderEmailResendUseCase: {
      execute: prepareExecute,
    } as unknown as PrepareOrderEmailResendUseCase,
    deliverOrderEmailUseCase: {
      execute: deliverExecute,
    } as unknown as DeliverOrderEmailUseCase,
  });

  return { deliverExecute, prepareExecute, readExecute, storeOrderController };
}

function pageUrl(sessionId: string | null): URL {
  const url = new URL("https://eli.example/store/checkout/complete");

  if (sessionId !== null) {
    url.searchParams.set("session_id", sessionId);
  }

  return url;
}

function resendRequest(fields: Record<string, string>): Request {
  const formData = new FormData();

  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value);
  }

  return new Request("https://eli.example/api/store/orders/email", {
    body: formData,
    method: "POST",
  });
}

describe("StoreOrderController", () => {
  it("loads a confirmed order uncached and without a referrer", async () => {
    // arrange
    const { storeOrderController } = createController({
      read: { status: "confirmed", confirmation },
    });

    // act
    const loaded = await storeOrderController.loadConfirmation(
      pageUrl(SESSION_ID),
    );

    // assert
    expect(loaded.data).toEqual({
      status: "confirmed",
      sessionId: SESSION_ID,
      ...confirmation,
    });
    expect(new Headers(loaded.init?.headers).get("Cache-Control")).toBe(
      "no-store",
    );
    expect(new Headers(loaded.init?.headers).get("Referrer-Policy")).toBe(
      "no-referrer",
    );
  });

  it("answers not completed for a missing or malformed session id without reading any order", async () => {
    // arrange
    const { readExecute, storeOrderController } = createController({});

    // act
    const loaded = await Promise.all([
      storeOrderController.loadConfirmation(pageUrl(null)),
      storeOrderController.loadConfirmation(pageUrl("<script>")),
    ]);

    // assert
    expect(loaded.map((page) => page.data)).toEqual([
      { status: "not_completed" },
      { status: "not_completed" },
    ]);
    expect(readExecute).not.toHaveBeenCalled();
  });

  it("sends the order email again and answers sent", async () => {
    // arrange
    const delivery = { deliveryAttemptId: 52 } as OrderEmailDelivery;
    const { deliverExecute, prepareExecute, storeOrderController } =
      createController({ prepared: { status: "prepared", delivery } });

    // act
    const response = await storeOrderController.resendEmail(
      resendRequest({ sessionId: SESSION_ID }),
    );

    // assert
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      outcome: "sent",
    });
    expect(prepareExecute).toHaveBeenCalledWith(SESSION_ID);
    expect(deliverExecute).toHaveBeenCalledWith(delivery);
  });

  it("answers each outcome that sends nothing", async () => {
    // arrange
    const outcomes: PrepareOrderEmailResendResult[] = [
      { status: "processing" },
      { status: "rate_limited" },
      { status: "not_found" },
    ];

    // act
    const responses = await Promise.all(
      outcomes.map((prepared) =>
        createController({ prepared }).storeOrderController.resendEmail(
          resendRequest({ sessionId: SESSION_ID }),
        ),
      ),
    );

    // assert
    const bodies = await Promise.all(
      responses.map((response) => response.json()),
    );
    expect(bodies).toEqual([
      { success: true, outcome: "processing" },
      { success: true, outcome: "rate_limited" },
      { success: true, outcome: "not_found" },
    ]);
  });

  it("answers temporary unavailability when the email could not be sent", async () => {
    // arrange
    const { storeOrderController } = createController({
      prepared: { status: "prepared", delivery: {} as OrderEmailDelivery },
      delivered: "not_sent",
    });

    // act
    const response = await storeOrderController.resendEmail(
      resendRequest({ sessionId: SESSION_ID }),
    );

    // assert
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "resend_unavailable",
        message: "Unable to send the order email.",
      },
    });
  });

  it("refuses a malformed resend request", async () => {
    // arrange
    const { prepareExecute, storeOrderController } = createController({});

    // act
    const responses = await Promise.all([
      storeOrderController.resendEmail(resendRequest({ sessionId: "pi_1" })),
      storeOrderController.resendEmail(
        resendRequest({ sessionId: SESSION_ID, extra: "1" }),
      ),
    ]);

    // assert
    expect(responses.map((response) => response.status)).toEqual([400, 400]);
    expect(prepareExecute).not.toHaveBeenCalled();
  });
});
