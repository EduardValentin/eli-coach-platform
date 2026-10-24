import type {
  EditableClientIdentity,
  UpdateClientIdentityAsCoachUseCase,
  UpdateOwnClientIdentityUseCase,
} from "@eli-coach-platform/domain/client";
import {
  createBadRequestResponse,
  readJsonRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";

import {
  clientIdentityProblemsAnswerSchema,
  clientIdentityRefusalSchema,
  clientIdentitySavedAnswerSchema,
  type OwnClientIdentityRequest,
} from "~/features/clients/public/client-identity";

type IdentityUpdateResult = Awaited<
  ReturnType<
    | UpdateClientIdentityAsCoachUseCase["execute"]
    | UpdateOwnClientIdentityUseCase["execute"]
  >
>;

const IDENTITY_REQUEST_MAX_BYTES = 4 * 1024;

const REFUSAL_STATUS = {
  "not-found": 404,
  "not-on-journey": 404,
  ended: 409,
} as const;

export function identityBodyOf(request: Request): Promise<unknown> {
  return readJsonRequestBody(request, {
    maxBytes: IDENTITY_REQUEST_MAX_BYTES,
  });
}

export function enteredIdentityOf(
  request: OwnClientIdentityRequest,
): EditableClientIdentity {
  return {
    firstName: request.firstName,
    lastName: request.lastName,
    dateOfBirth: request.dateOfBirth,
    country: request.country,
    phone: {
      country: request.phoneCountry ?? "",
      nationalNumber: request.phoneNumber ?? "",
    },
  };
}

export function identityUpdatedResponse(
  result: IdentityUpdateResult,
): Response {
  if (result.status === "saved") {
    return Response.json(
      clientIdentitySavedAnswerSchema.parse({ status: result.status }),
    );
  }

  if (result.status === "invalid") {
    return Response.json(
      clientIdentityProblemsAnswerSchema.parse({ problems: result.problems }),
      { status: 422 },
    );
  }

  return Response.json(
    clientIdentityRefusalSchema.parse({ error: result.status }),
    { status: REFUSAL_STATUS[result.status] },
  );
}

export function unreadableIdentityResponse(): Response {
  return createBadRequestResponse("The identity could not be read.");
}
