import type {
  ClientProfileReading,
  ReadClientMeasurementHistoryUseCase,
  ReadClientProfileUseCase,
  UpdateClientProfileAsCoachUseCase,
} from "@eli-coach-platform/domain/client-profile";
import {
  createBadRequestResponse,
  readJsonRequestBody,
} from "~/shared/http/index.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requireApiAccount } from "~/bounded-contexts/access/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/bounded-contexts/access/accounts/server/guards/require-portal-access.server";
import {
  clientProfileProblemsAnswerSchema,
  clientProfileRefusalSchema,
  clientProfileSavedAnswerSchema,
  clientProfileSchema,
  coachProfileRequestSchema,
  type ClientProfileView,
} from "~/bounded-contexts/clients/client-profile/public/client-profile";
import {
  measurementHistorySchema,
  presentMeasurements,
  type MeasurementRow,
} from "~/bounded-contexts/clients/client-profile/public/measurements";
import { clientAvatarPath } from "~/bounded-contexts/clients/client-profile/public/paths";

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
    const target = this.requireCoachClientId(args, clientId);
    const reading = await this.options.readClientProfile.execute(target);

    if (!reading) {
      throw this.notFoundResponse();
    }

    return clientProfileSchema.parse(this.presentReading(reading));
  }

  async loadMeasurements(
    args: LoaderFunctionArgs,
    clientId: string,
  ): Promise<MeasurementRow[]> {
    const target = this.requireCoachClientId(args, clientId);
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
      return this.notFoundResponse();
    }

    const request = coachProfileRequestSchema.safeParse(
      await readJsonRequestBody(args.request, {
        maxBytes: COACH_PROFILE_REQUEST_MAX_BYTES,
      }),
    );

    if (!request.success) {
      return createBadRequestResponse("The profile could not be read.");
    }

    return this.savedResponse(
      await this.options.updateClientProfile.execute({
        clientId: target.data,
        edit: request.data,
      }),
    );
  }

  private presentReading(reading: ClientProfileReading) {
    const { avatarId, ...profile } = reading;

    return {
      ...profile,
      avatarUrl:
        avatarId === null
          ? null
          : clientAvatarPath({ clientId: reading.identity.clientId, avatarId }),
    };
  }

  private savedResponse(result: UpdateClientProfileResult): Response {
    if (result.status === "saved") {
      return Response.json(
        clientProfileSavedAnswerSchema.parse({ status: result.status }),
      );
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

  private requireCoachClientId(
    args: LoaderFunctionArgs,
    clientId: string,
  ): string {
    requirePortalAccess(args, { role: "COACH" });
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      throw this.notFoundResponse();
    }

    return target.data;
  }

  private notFoundResponse(): Response {
    return new Response("Not Found", { status: 404 });
  }
}
