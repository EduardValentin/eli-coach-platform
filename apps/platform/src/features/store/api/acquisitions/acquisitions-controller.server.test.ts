import { describe, expect, it, vi } from "vitest";

import type {
  AcquireProductsResult,
  AcquireProductsUseCase,
} from "@eli-coach-platform/domain/acquisition";

import {
  STORE_ACQUISITION_TURNSTILE_ACTION,
  TURNSTILE_RESPONSE_FIELD,
} from "@eli-coach-platform/infrastructure/bot-detection";

import { StoreAcquisitionController } from "./acquisitions-controller.server";

describe("StoreAcquisitionController", () => {
  it("verifies the store action before acquiring and returns success only for accepted delivery", async () => {
    // arrange
    const events: string[] = [];
    const botVerifier = {
      verifySubmission: vi.fn(async () => {
        events.push("verified");
        return { status: "verified" as const };
      }),
    };
    const acquireProducts = {
      execute: vi.fn(async () => {
        events.push("acquired");
        return { status: "delivered" };
      }),
    } as unknown as AcquireProductsUseCase;
    const controller = new StoreAcquisitionController(
      acquireProducts,
      botVerifier,
    );

    // act
    const response = await controller.acquire(createRequest());

    // assert
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(events).toEqual(["verified", "acquired"]);
    expect(botVerifier.verifySubmission).toHaveBeenCalledWith({
      action: STORE_ACQUISITION_TURNSTILE_ACTION,
      remoteIp: "203.0.113.9",
      token: "verified-token",
    });
  });

  it("never invokes the domain use case when bot verification fails", async () => {
    // arrange
    const acquireProducts = {
      execute: vi.fn(),
    } as unknown as AcquireProductsUseCase;
    const controller = new StoreAcquisitionController(acquireProducts, {
      verifySubmission: vi.fn().mockResolvedValue({ status: "rejected" }),
    });

    // act
    const response = await controller.acquire(createRequest());

    // assert
    expect(response.status).toBe(400);
    expect(acquireProducts.execute).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "bot_verification_failed",
        message: "Unable to deliver store resources.",
      },
    });
  });

  it("reports bot verification infrastructure failures as temporary unavailability", async () => {
    // arrange
    const acquireProducts = {
      execute: vi.fn(),
    } as unknown as AcquireProductsUseCase;
    const controller = new StoreAcquisitionController(acquireProducts, {
      verifySubmission: vi.fn().mockResolvedValue({ status: "unavailable" }),
    });

    // act
    const response = await controller.acquire(createRequest());

    // assert
    expect(response.status).toBe(503);
    expect(acquireProducts.execute).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "server_error",
        message: "Unable to deliver store resources.",
      },
    });
  });

  it("returns available product identifiers for atomic cart reconciliation", async () => {
    // arrange
    const acquireProducts = {
      execute: vi.fn().mockResolvedValue({
        status: "unavailable_products",
        availableProductSlugs: ["hormone-harmony"],
      }),
    } as unknown as AcquireProductsUseCase;
    const controller = new StoreAcquisitionController(acquireProducts, {
      verifySubmission: vi.fn().mockResolvedValue({ status: "verified" }),
    });

    // act
    const response = await controller.acquire(createRequest());

    // assert
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        availableProductSlugs: ["hormone-harmony"],
        code: "unavailable_products",
        message: "Unable to deliver store resources.",
      },
    });
  });

  it("returns a retryable response when delivery outcome is ambiguous", async () => {
    // arrange
    const acquireProducts = {
      execute: vi.fn().mockResolvedValue({
        status: "delivery_retryable",
      }),
    } as unknown as AcquireProductsUseCase;
    const controller = new StoreAcquisitionController(acquireProducts, {
      verifySubmission: vi.fn().mockResolvedValue({ status: "verified" }),
    });

    // act
    const response = await controller.acquire(createRequest());

    // assert
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "delivery_retryable",
        message: "Unable to deliver store resources.",
      },
    });
  });

  it("returns a distinct rate-limited response inside the delivery cooldown", async () => {
    // arrange
    const acquireProducts = {
      execute: vi.fn().mockResolvedValue({
        status: "rate_limited",
        window: "cooldown",
      }),
    } as unknown as AcquireProductsUseCase;
    const controller = new StoreAcquisitionController(acquireProducts, {
      verifySubmission: vi.fn().mockResolvedValue({ status: "verified" }),
    });

    // act
    const response = await controller.acquire(createRequest());

    // assert
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "rate_limited_cooldown",
        message: "Unable to deliver store resources.",
      },
    });
  });

  it("reports an exhausted rolling allowance as its own outcome", async () => {
    // arrange
    const controllerFor = (result: AcquireProductsResult) =>
      new StoreAcquisitionController(
        {
          execute: vi.fn().mockResolvedValue(result),
        } as unknown as AcquireProductsUseCase,
        {
          verifySubmission: vi.fn().mockResolvedValue({ status: "verified" }),
        },
      );

    // act
    const limited = await controllerFor({
      status: "rate_limited",
      window: "daily",
    }).acquire(createRequest());
    const failed = await controllerFor({
      status: "delivery_unavailable",
    }).acquire(createRequest());

    // assert
    expect(limited.status).toBe(429);
    await expect(limited.json()).resolves.toEqual({
      success: false,
      error: {
        code: "rate_limited_daily",
        message: "Unable to deliver store resources.",
      },
    });
    expect(failed.status).toBe(503);
  });

  it("rejects an oversized streamed body before bot verification or acquisition", async () => {
    // arrange
    const acquireProducts = {
      execute: vi.fn(),
    } as unknown as AcquireProductsUseCase;
    const botVerifier = {
      verifySubmission: vi.fn(),
    };
    const controller = new StoreAcquisitionController(
      acquireProducts,
      botVerifier,
    );
    const request = new Request("https://eli.example/api/store/acquisitions", {
      body: new URLSearchParams({
        email: `${"a".repeat(17 * 1024)}@example.com`,
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    // act
    const response = await controller.acquire(request);

    // assert
    expect(request.headers.has("Content-Length")).toBe(false);
    expect(response.status).toBe(413);
    expect(botVerifier.verifySubmission).not.toHaveBeenCalled();
    expect(acquireProducts.execute).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "invalid_request",
        message: "Unable to deliver store resources.",
      },
    });
  });
});

function createRequest(): Request {
  const formData = new FormData();
  formData.set("email", "woman@example.com");
  formData.set("idempotencyKey", "d744ad8e-632c-4dfe-ac70-033bd3221522");
  formData.set("marketingConsent", "false");
  formData.set(
    "productSlugs",
    JSON.stringify(["hormone-harmony", "nutrition-foundations"]),
  );
  formData.set("termsAccepted", "true");
  formData.set(TURNSTILE_RESPONSE_FIELD, "verified-token");

  return new Request("https://eli.example/api/store/acquisitions", {
    body: formData,
    headers: { "CF-Connecting-IP": "203.0.113.9" },
    method: "POST",
  });
}
