import { afterEach, describe, expect, it, vi } from "vitest";

import { ConsoleLoggerAdapter } from "~/shared/logging/console-logger-adapter.server";

import { StoreIncidentsAdapter } from "./store-incidents-adapter.server";

describe("createStoreIncidents", () => {
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
});
