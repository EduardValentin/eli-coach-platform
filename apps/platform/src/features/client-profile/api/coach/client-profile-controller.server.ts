import type {
  ClientProfileReading,
  ReadClientMeasurementHistoryUseCase,
  ReadClientProfileUseCase,
  UpdateClientProfileAsCoachUseCase,
} from "@eli-coach-platform/domain/client-profile";
import {
  createBadRequestResponse,
  readJsonRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  clientProfileProblemsAnswerSchema,
  clientProfileRefusalSchema,
  clientProfileSchema,
  coachProfileRequestSchema,
  type ClientProfileView,
} from "~/features/client-profile/public/client-profile";
import {
  measurementHistorySchema,
  presentMeasurements,
  type MeasurementRow,
} from "~/features/client-profile/public/measurements";
import { clientAvatarPath } from "~/features/client-profile/public/paths";

type ClientProfileControllerOptions = {
  readClientMeasurementHistory: ReadClientMeasurementHistoryUseCase;
  readClientProfile: ReadClientProfileUseCase;
  updateClientProfile: UpdateClientProfileAsCoachUseCase;
};

type UpdateClientProfileResult = Awaited<
  ReturnType<UpdateClientProfileAsCoachUseCase["execute"]>
>;

const clientIdSchema = z.uuid();

const COACH_PROFILE_REQUEST_MAX_BYTES = 16 * 1024;

const REFUSAL_STATUS = {
  "not-found": 404,
  "not-seeded": 409,
  "changed-meanwhile": 409,
} as const;

export class ClientProfileController {
  constructor(private readonly options: ClientProfileControllerOptions) {}

  async load(
    args: LoaderFunctionArgs,
    clientId: string,
  ): Promise<ClientProfileView> {
    const target = requireCoachClientId(args, clientId);
    const reading = await this.options.readClientProfile.execute(target);

    if (!reading) {
      throw notFoundResponse();
    }

    return clientProfileSchema.parse(presentReading(reading));
  }

  async loadMeasurements(
    args: LoaderFunctionArgs,
    clientId: string,
  ): Promise<MeasurementRow[]> {
    const target = requireCoachClientId(args, clientId);
    const history = await this.options.readClientMeasurementHistory.execute({
      clientId: target,
    });

    return measurementHistorySchema.parse(
      presentMeasurements(history.newestFirst()),
    );
  }

  async save(
    args: ActionFunctionArgs,
    clientId: string | undefined,
  ): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      return notFoundResponse();
    }

    const request = coachProfileRequestSchema.safeParse(
      await readJsonRequestBody(args.request, {
        maxBytes: COACH_PROFILE_REQUEST_MAX_BYTES,
      }),
    );

    if (!request.success) {
      return createBadRequestResponse("The profile could not be read.");
    }

    return savedResponse(
      await this.options.updateClientProfile.execute({
        clientId: target.data,
        edit: request.data,
      }),
    );
  }
}

function presentReading(reading: ClientProfileReading) {
  const { hasAvatar, ...profile } = reading;

  return {
    ...profile,
    avatarUrl: hasAvatar ? clientAvatarPath(reading.identity.clientId) : null,
  };
}

function savedResponse(result: UpdateClientProfileResult): Response {
  if (result.status === "saved") {
    return new Response(null, { status: 204 });
  }

  if (result.status === "invalid") {
    return Response.json(
      clientProfileProblemsAnswerSchema.parse({ problems: result.problems }),
      { status: 422 },
    );
  }

  return Response.json(
    clientProfileRefusalSchema.parse({ error: result.status }),
    { status: REFUSAL_STATUS[result.status] },
  );
}

function requireCoachClientId(
  args: LoaderFunctionArgs,
  clientId: string,
): string {
  requirePortalAccess(args, { role: "COACH" });
  const target = clientIdSchema.safeParse(clientId);

  if (!target.success) {
    throw notFoundResponse();
  }

  return target.data;
}

function notFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
