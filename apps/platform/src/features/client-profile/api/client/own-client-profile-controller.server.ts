import type {
  OwnClientProfileReading,
  ReadOwnClientProfileUseCase,
  UpdateOwnClientProfileUseCase,
} from "@eli-coach-platform/domain/client-profile";
import {
  createBadRequestResponse,
  readJsonRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  clientProfileProblemsAnswerSchema,
  clientProfileRefusalSchema,
  clientProfileSavedAnswerSchema,
} from "~/features/client-profile/public/client-profile";
import {
  ownClientProfileSchema,
  ownProfileRequestSchema,
  type OwnClientProfileView,
} from "~/features/client-profile/public/own-client-profile";
import { clientAvatarPath } from "~/features/client-profile/public/paths";

type OwnClientProfileControllerOptions = {
  readOwnClientProfile: ReadOwnClientProfileUseCase;
  updateOwnClientProfile: UpdateOwnClientProfileUseCase;
};

type UpdateOwnClientProfileResult = Awaited<
  ReturnType<UpdateOwnClientProfileUseCase["execute"]>
>;

const OWN_PROFILE_REQUEST_MAX_BYTES = 8 * 1024;

const REFUSAL_STATUS = {
  "not-on-journey": 404,
  ended: 409,
  "not-seeded": 409,
  "changed-meanwhile": 409,
} as const;

export class OwnClientProfileController {
  constructor(private readonly options: OwnClientProfileControllerOptions) {}

  async load(args: LoaderFunctionArgs): Promise<OwnClientProfileView> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const reading = await this.options.readOwnClientProfile.execute(
      client.authSubjectId,
    );

    if (!reading) {
      throw new Response("Not Found", { status: 404 });
    }

    return ownClientProfileSchema.parse(this.presentReading(reading));
  }

  async save(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });
    const request = ownProfileRequestSchema.safeParse(
      await readJsonRequestBody(args.request, {
        maxBytes: OWN_PROFILE_REQUEST_MAX_BYTES,
      }),
    );

    if (!request.success) {
      return createBadRequestResponse("The profile could not be read.");
    }

    return this.savedResponse(
      await this.options.updateOwnClientProfile.execute({
        authSubjectId: client.authSubjectId,
        facts: request.data.facts,
      }),
    );
  }

  private presentReading(reading: OwnClientProfileReading) {
    const { avatarId, ...profile } = reading;

    return {
      ...profile,
      avatarUrl:
        avatarId === null
          ? null
          : clientAvatarPath({ clientId: reading.identity.clientId, avatarId }),
    };
  }

  private savedResponse(result: UpdateOwnClientProfileResult): Response {
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
}
