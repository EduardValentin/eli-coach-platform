import type {
  ReadClientMeasurementHistoryUseCase,
  ReadClientProfileUseCase,
} from "@eli-coach-platform/domain/client-profile";
import type { LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  clientProfileSchema,
  type ClientProfileView,
} from "~/features/client-profile/contracts/client-profile";
import {
  measurementHistorySchema,
  presentMeasurements,
  type MeasurementRow,
} from "~/features/client-profile/contracts/measurements";

type ClientProfileControllerOptions = {
  readClientMeasurementHistory: ReadClientMeasurementHistoryUseCase;
  readClientProfile: ReadClientProfileUseCase;
};

const clientIdSchema = z.uuid();

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

    return clientProfileSchema.parse(reading);
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
