import { createHash } from "node:crypto";

import {
  storeAcquisitionRequestSchema,
  storeAcquisitionResponseSchema,
  type StoreAcquisitionErrorCode,
} from "@eli-coach-platform/contracts";
import type {
  StoreAcquisitionResult,
  StoreAcquisitionService,
} from "@eli-coach-platform/domain";

import {
  STORE_ACQUISITION_TURNSTILE_ACTION,
  TURNSTILE_RESPONSE_FIELD,
} from "@eli-coach-platform/infrastructure/bot-detection";
import {
  resolveRequestRemoteIp,
  type BotVerifier,
} from "@eli-coach-platform/infrastructure/bot-detection/server";
import { readFormDataRequestBody } from "~/server/http.server";

const ERROR_MESSAGE = "Unable to deliver store resources.";
const MAX_ACQUISITION_BODY_BYTES = 16 * 1024;

export class StoreAcquisitionController {
  constructor(
    private readonly acquisitionService: StoreAcquisitionService,
    private readonly botVerifier: BotVerifier,
  ) {}

  async acquire(request: Request): Promise<Response> {
    const requestBody = await readFormDataRequestBody(request, {
      maxBytes: MAX_ACQUISITION_BODY_BYTES,
    });

    if (requestBody.status !== "valid") {
      return createErrorResponse(
        "invalid_request",
        requestBody.status === "too_large" ? 413 : 400,
      );
    }

    const formData = requestBody.formData;
    const parsedRequest = storeAcquisitionRequestSchema.safeParse({
      email: formData.get("email"),
      idempotencyKey: formData.get("idempotencyKey"),
      marketingConsent: formData.get("marketingConsent"),
      productSlugs: formData.get("productSlugs"),
      termsAccepted: formData.get("termsAccepted"),
    });

    if (!parsedRequest.success) {
      return createErrorResponse("invalid_request", 400);
    }

    const verification = await this.botVerifier.verifySubmission({
      action: STORE_ACQUISITION_TURNSTILE_ACTION,
      remoteIp: resolveRequestRemoteIp(request),
      token: resolveTurnstileToken(formData),
    });

    if (verification.status === "unavailable") {
      return createErrorResponse("server_error", 503);
    }

    if (verification.status === "rejected") {
      return createErrorResponse("bot_verification_failed", 400);
    }

    try {
      const result = await this.acquisitionService.acquire({
        email: parsedRequest.data.email,
        idempotencyKey: parsedRequest.data.idempotencyKey,
        marketingConsent: parsedRequest.data.marketingConsent,
        productSlugs: parsedRequest.data.productSlugs,
      });

      return createAcquisitionResponse(result);
    } catch {
      console.error("Store acquisition failed.", {
        emailHash: hashEmail(parsedRequest.data.email),
        errorCategory: "store_acquisition_failure",
      });

      return createErrorResponse("server_error", 500);
    }
  }
}

function resolveTurnstileToken(formData: FormData): string | null {
  const token = formData.get(TURNSTILE_RESPONSE_FIELD);

  return typeof token === "string" && token.trim() ? token : null;
}

function createAcquisitionResponse(
  result: StoreAcquisitionResult,
): Response {
  if (result.status === "delivered") {
    return Response.json(
      storeAcquisitionResponseSchema.parse({ success: true }),
      { status: 201 },
    );
  }

  if (result.status === "unavailable_products") {
    return createErrorResponse("unavailable_products", 409, {
      availableProductSlugs: result.availableProductSlugs,
    });
  }

  if (result.status === "idempotency_conflict") {
    return createErrorResponse("idempotency_conflict", 409);
  }

  if (result.status === "delivery_retryable") {
    return createErrorResponse("delivery_retryable", 503);
  }

  return createErrorResponse("delivery_unavailable", 503);
}

function createErrorResponse(
  code: StoreAcquisitionErrorCode,
  status: number,
  details: { availableProductSlugs?: readonly string[] } = {},
): Response {
  return Response.json(
    storeAcquisitionResponseSchema.parse({
      error: {
        ...details,
        code,
        message: ERROR_MESSAGE,
      },
      success: false,
    }),
    { status },
  );
}

function hashEmail(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
}
