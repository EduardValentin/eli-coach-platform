import type {
  ReadOwnClientSettingsUseCase,
  SaveUnitPreferenceUseCase,
} from "~/bounded-contexts/clients/client-profile/domain/client-settings";
import {
  createBadRequestResponse,
  readJsonRequestBody,
} from "~/shared/http/index.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { requireApiAccount } from "~/bounded-contexts/access/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/bounded-contexts/access/accounts/server/guards/require-portal-access.server";
import {
  clientSettingsSchema,
  type ClientSettingsView,
} from "~/bounded-contexts/clients/client-profile/public/client-settings";
import {
  unitPreferenceRefusalSchema,
  unitPreferenceSavedAnswerSchema,
  unitPreferenceSchema,
} from "~/bounded-contexts/clients/client-profile/public/unit-preference";

type ClientSettingsControllerOptions = {
  readOwnClientSettings: ReadOwnClientSettingsUseCase;
  saveUnitPreference: SaveUnitPreferenceUseCase;
};

const UNIT_PREFERENCE_REQUEST_MAX_BYTES = 1024;

const REFUSAL_STATUS = {
  "not-on-journey": 404,
  ended: 409,
} as const;

export class ClientSettingsController {
  constructor(private readonly options: ClientSettingsControllerOptions) {}

  async load(args: LoaderFunctionArgs): Promise<ClientSettingsView> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const settings = await this.options.readOwnClientSettings.execute(
      client.authSubjectId,
    );

    if (!settings) {
      throw new Response("Not Found", { status: 404 });
    }

    return clientSettingsSchema.parse({
      units: settings.unitPreference,
      preferredCheckInWeekday: settings.preferredCheckInWeekday,
      preferredChannel: settings.preferredChannel,
    });
  }

  async saveUnits(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });
    const request = unitPreferenceSchema.safeParse(
      await readJsonRequestBody(args.request, {
        maxBytes: UNIT_PREFERENCE_REQUEST_MAX_BYTES,
      }),
    );

    if (!request.success) {
      return createBadRequestResponse("The units could not be read.");
    }

    const result = await this.options.saveUnitPreference.execute({
      authSubjectId: client.authSubjectId,
      preference: request.data,
    });

    if (result.status === "saved") {
      return Response.json(
        unitPreferenceSavedAnswerSchema.parse({ status: "saved" }),
      );
    }

    return Response.json(
      unitPreferenceRefusalSchema.parse({ error: result.status }),
      { status: REFUSAL_STATUS[result.status] },
    );
  }
}
