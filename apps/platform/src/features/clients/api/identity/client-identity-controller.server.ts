import type {
  ClientIdentityProblems,
  UpdateClientIdentityAsCoachUseCase,
  UpdateOwnClientIdentityUseCase,
} from "@eli-coach-platform/domain/client";
import {
  createBadRequestResponse,
  readJsonRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";
import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import { findCountry } from "~/features/assessment-calls/public/countries";
import { normalizeVisitorPhone } from "~/features/assessment-calls/public/visitor-profile";
import {
  clientIdentityProblemsAnswerSchema,
  clientIdentityRefusalSchema,
  clientIdentitySavedAnswerSchema,
  coachClientIdentityRequestSchema,
  ownClientIdentityRequestSchema,
  type OwnClientIdentityRequest,
} from "~/features/clients/public/client-identity";

type ClientIdentityControllerOptions = {
  updateClientIdentityAsCoach: UpdateClientIdentityAsCoachUseCase;
  updateOwnClientIdentity: UpdateOwnClientIdentityUseCase;
};

type IdentityUpdateResult = Awaited<
  ReturnType<
    | UpdateClientIdentityAsCoachUseCase["execute"]
    | UpdateOwnClientIdentityUseCase["execute"]
  >
>;

type EnteredIdentity = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  country: string;
  phone: string | null;
};

type IdentityReading =
  | { status: "read"; identity: EnteredIdentity }
  | { status: "invalid"; problems: ClientIdentityProblems };

const clientIdSchema = z.uuid();

const IDENTITY_REQUEST_MAX_BYTES = 4 * 1024;

const REFUSAL_STATUS = {
  "not-found": 404,
  "not-on-journey": 404,
  ended: 409,
} as const;

export class ClientIdentityController {
  constructor(private readonly options: ClientIdentityControllerOptions) {}

  async saveAsCoach(
    args: ActionFunctionArgs,
    clientId: string | undefined,
  ): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      return new Response("Not Found", { status: 404 });
    }

    const request = coachClientIdentityRequestSchema.safeParse(
      await this.bodyOf(args.request),
    );

    if (!request.success) {
      return this.unreadableResponse();
    }

    const entered = this.identityOf(request.data);

    if (entered.status === "invalid") {
      return this.updatedResponse(entered);
    }

    return this.updatedResponse(
      await this.options.updateClientIdentityAsCoach.execute({
        clientId: target.data,
        identity: { ...entered.identity, gender: request.data.gender },
      }),
    );
  }

  async saveOwn(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });
    const request = ownClientIdentityRequestSchema.safeParse(
      await this.bodyOf(args.request),
    );

    if (!request.success) {
      return this.unreadableResponse();
    }

    const entered = this.identityOf(request.data);

    if (entered.status === "invalid") {
      return this.updatedResponse(entered);
    }

    return this.updatedResponse(
      await this.options.updateOwnClientIdentity.execute({
        authSubjectId: client.authSubjectId,
        identity: entered.identity,
      }),
    );
  }

  private bodyOf(request: Request): Promise<unknown> {
    return readJsonRequestBody(request, {
      maxBytes: IDENTITY_REQUEST_MAX_BYTES,
    });
  }

  private identityOf(request: OwnClientIdentityRequest): IdentityReading {
    const phone = normalizeVisitorPhone({
      country: request.phoneCountry ?? "",
      nationalNumber: request.phoneNumber ?? "",
    });
    const problems: ClientIdentityProblems = {
      ...(phone.status === "invalid" && { phone: "invalid" }),
      ...(findCountry(request.country) === undefined && { country: "invalid" }),
    };

    if (Object.keys(problems).length > 0) {
      return { status: "invalid", problems };
    }

    return {
      status: "read",
      identity: {
        firstName: request.firstName,
        lastName: request.lastName,
        dateOfBirth: request.dateOfBirth,
        country: request.country,
        phone: phone.status === "valid" ? phone.e164 : null,
      },
    };
  }

  private updatedResponse(
    result:
      IdentityUpdateResult | Extract<IdentityReading, { status: "invalid" }>,
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

  private unreadableResponse(): Response {
    return createBadRequestResponse("The identity could not be read.");
  }
}
