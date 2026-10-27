import type {
  ListClientAvatarsUseCase,
  RemoveClientAvatarAsCoachUseCase,
  UploadClientAvatarAsCoachUseCase,
} from "@eli-coach-platform/domain/client-profile";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requireApiAccount } from "~/bounded-contexts/access/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/bounded-contexts/access/accounts/server/guards/require-portal-access.server";
import {
  avatarWrittenResponse,
  receivedAvatarOf,
  unreceivedAvatarResponse,
} from "~/bounded-contexts/clients/client-profile/api/client-avatar-transport.server";
import {
  clientAvatarUrlsSchema,
  type ClientAvatarUrls,
} from "~/bounded-contexts/clients/client-profile/public/client-avatar";
import { clientAvatarPath } from "~/bounded-contexts/clients/client-profile/public/paths";

type CoachClientAvatarControllerOptions = {
  listClientAvatars: ListClientAvatarsUseCase;
  removeClientAvatarAsCoach: RemoveClientAvatarAsCoachUseCase;
  uploadClientAvatarAsCoach: UploadClientAvatarAsCoachUseCase;
};

const clientIdSchema = z.uuid();

export class CoachClientAvatarController {
  constructor(private readonly options: CoachClientAvatarControllerOptions) {}

  async upload(
    args: ActionFunctionArgs,
    clientId: string | undefined,
  ): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      return this.notFoundResponse();
    }

    const part = await receivedAvatarOf(args.request);

    if (part.status !== "received") {
      return unreceivedAvatarResponse(part);
    }

    return avatarWrittenResponse(
      await this.options.uploadClientAvatarAsCoach.execute({
        clientId: target.data,
        avatar: part.avatar,
      }),
    );
  }

  async remove(
    args: ActionFunctionArgs,
    clientId: string | undefined,
  ): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      return this.notFoundResponse();
    }

    return avatarWrittenResponse(
      await this.options.removeClientAvatarAsCoach.execute(target.data),
    );
  }

  async urlsFor(
    args: LoaderFunctionArgs,
    clientIds: readonly string[],
  ): Promise<ClientAvatarUrls> {
    requirePortalAccess(args, { role: "COACH" });
    const avatars = await this.options.listClientAvatars.execute(clientIds);
    const avatarOf = new Map(
      avatars.map((avatar) => [avatar.clientId, avatar]),
    );

    return clientAvatarUrlsSchema.parse(
      Object.fromEntries(
        clientIds.map((clientId) => {
          const avatar = avatarOf.get(clientId);

          return [clientId, avatar ? clientAvatarPath(avatar) : null];
        }),
      ),
    );
  }

  private notFoundResponse(): Response {
    return new Response("Not Found", { status: 404 });
  }
}
