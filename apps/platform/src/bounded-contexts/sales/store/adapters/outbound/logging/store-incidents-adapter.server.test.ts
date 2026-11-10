import { afterEach, describe, expect, it, vi } from "vitest";

import { ConsoleLoggerAdapter } from "~/shared/logging/console-logger-adapter.server";

import { StoreIncidentsAdapter } from "./store-incidents-adapter.server";

describe("StoreIncidentsAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs rejected product delivery without recipient data", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const storeIncidentsAdapter = new StoreIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    storeIncidentsAdapter.deliveryRejected({
      reason: "invalid_from_address",
      requestId: 31,
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Store delivery provider rejected the request.",
      {
        errorCategory: "store_delivery_rejected",
        providerRejectionReason: "invalid_from_address",
        requestId: 31,
      },
    );
  });

  it("logs a pending product delivery acceptance audit", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const storeIncidentsAdapter = new StoreIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    storeIncidentsAdapter.deliveryAcceptanceAuditPending({ requestId: 31 });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Store delivery acceptance audit requires reconciliation.",
      {
        errorCategory: "store_delivery_acceptance_audit_pending",
        requestId: 31,
      },
    );
  });

  it("logs a pending retryable product delivery audit", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const storeIncidentsAdapter = new StoreIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    storeIncidentsAdapter.retryableDeliveryAuditPending({ requestId: 31 });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Store retryable delivery audit requires reconciliation.",
      {
        errorCategory: "store_delivery_retryable_audit_pending",
        requestId: 31,
      },
    );
  });

  it("logs a paid order whose charge differs from its total without recipient data", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const storeIncidentsAdapter = new StoreIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    storeIncidentsAdapter.paymentAmountMismatch({
      orderId: "order-1",
      expectedMinorUnits: 3900,
      expectedCurrency: "EUR",
      chargedMinorUnits: 100,
      chargedCurrency: "EUR",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Store order was charged an amount other than its total.",
      {
        chargedCurrency: "EUR",
        chargedMinorUnits: 100,
        errorCategory: "store_order_amount_mismatch",
        expectedCurrency: "EUR",
        expectedMinorUnits: 3900,
        orderId: "order-1",
      },
    );
  });

  it("logs a payment for an order the store does not hold", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const storeIncidentsAdapter = new StoreIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    storeIncidentsAdapter.paidOrderUnknown({
      eventId: "evt_1",
      orderId: "order-1",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Store payment names an order the store does not hold.",
      {
        errorCategory: "store_order_unknown",
        eventId: "evt_1",
        orderId: "order-1",
      },
    );
  });

  it("logs a payment for a checkout session other than its order's without recipient data", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const storeIncidentsAdapter = new StoreIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    storeIncidentsAdapter.paidSessionMismatch({
      eventId: "evt_1",
      orderId: "order-1",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Store payment names a checkout session other than its order's.",
      {
        errorCategory: "store_order_session_mismatch",
        eventId: "evt_1",
        orderId: "order-1",
      },
    );
  });

  it("logs a resent link its grant does not hold yet by order only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const storeIncidentsAdapter = new StoreIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    storeIncidentsAdapter.orderLinkRotationPending({ orderId: "order-1" });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Store order resent a download link its grant does not hold yet.",
      {
        errorCategory: "store_order_link_rotation_pending",
        orderId: "order-1",
      },
    );
  });

  it("logs a refunded order by order, amount and currency as information", () => {
    // arrange
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const storeIncidentsAdapter = new StoreIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    storeIncidentsAdapter.orderRefunded({
      orderId: "order-1",
      refundedMinorUnits: 1500,
      currency: "EUR",
    });

    // assert
    expect(consoleInfo).toHaveBeenCalledWith(
      "Store order was refunded and its download access revoked.",
      {
        currency: "EUR",
        eventCategory: "store_order_refunded",
        orderId: "order-1",
        refundedMinorUnits: 1500,
      },
    );
  });

  it("logs order email failures by order only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const storeIncidentsAdapter = new StoreIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    storeIncidentsAdapter.orderEmailRejected({
      orderId: "order-1",
      reason: "invalid_to",
    });
    storeIncidentsAdapter.orderEmailAuditPending({ orderId: "order-1" });
    storeIncidentsAdapter.termsDocumentMissing({
      orderId: "order-1",
      termsVersion: "1.0",
    });

    // assert
    expect(consoleError.mock.calls).toEqual([
      [
        "Store order email was rejected by the provider.",
        {
          errorCategory: "store_order_email_rejected",
          orderId: "order-1",
          providerRejectionReason: "invalid_to",
        },
      ],
      [
        "Store order email acceptance audit requires reconciliation.",
        {
          errorCategory: "store_order_email_audit_pending",
          orderId: "order-1",
        },
      ],
      [
        "Store order email cannot attach the Terms she accepted.",
        {
          errorCategory: "store_order_terms_document_missing",
          orderId: "order-1",
          termsVersion: "1.0",
        },
      ],
    ]);
  });
});
