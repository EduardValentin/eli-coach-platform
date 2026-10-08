import type { SaveUnitPreferenceUseCase } from "@eli-coach-platform/domain/unit-preference";
import {
  createBadRequestResponse,
  readTextRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";
import type { ActionFunctionArgs } from "react-router";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import {
  unitPreferenceRefusalSchema,
  unitPreferenceSchema,
} from "~/features/client-profile/public/unit-preference";

type UnitPreferenceControllerOptions = {
  saveUnitPreference: SaveUnitPreferenceUseCase;
};

const UNIT_PREFERENCE_REQUEST_MAX_BYTES = 1024;

const NOT_ON_JOURNEY_STATUS = 404;

export class UnitPreferenceController {
  constructor(private readonly options: UnitPreferenceControllerOptions) {}

  async save(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });
    const request = unitPreferenceSchema.safeParse(
      await readJsonRequestBody(args.request),
    );

    if (!request.success) {
      return createBadRequestResponse("The units could not be read.");
    }

    const result = await this.options.saveUnitPreference.execute({
      authSubjectId: client.authSubjectId,
      preference: request.data,
    });

    if (result.status === "saved") {
      return new Response(null, { status: 204 });
    }

    return Response.json(
      unitPreferenceRefusalSchema.parse({ error: result.status }),
      { status: NOT_ON_JOURNEY_STATUS },
    );
  }
}

async function readJsonRequestBody(request: Request): Promise<unknown> {
  const body = await readTextRequestBody(request, {
    maxBytes: UNIT_PREFERENCE_REQUEST_MAX_BYTES,
  });

  if (body.status !== "valid") {
    return undefined;
  }

  try {
    return JSON.parse(body.text);
  } catch {
    return undefined;
  }
}
