import type {
  ListClientAvatarsUseCase,
  RemoveClientAvatarAsCoachUseCase,
  UploadClientAvatarAsCoachUseCase,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import {
  avatarWrittenResponse,
  receivedAvatarOf,
  unreceivedAvatarResponse,
} from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/client-avatar-transport.server";
import {
  clientAvatarUrlsSchema,
  type ClientAvatarUrls,
} from "~/bounded-contexts/clients/client-profile/public/client-avatar";
import { clientAvatarPath } from "~/bounded-contexts/clients/client-profile/public/paths";
import { accessContext } from "~/bounded-contexts/access/public/session";

type CoachClientAvatarControllerOptions = {
  listClientAvatarsUseCase: ListClientAvatarsUseCase;
  removeClientAvatarAsCoachUseCase: RemoveClientAvatarAsCoachUseCase;
  uploadClientAvatarAsCoachUseCase: UploadClientAvatarAsCoachUseCase;
};

const clientIdSchema = z.uuid();

export class CoachClientAvatarController {
  constructor(private readonly options: CoachClientAvatarControllerOptions) {}

  async upload(
    args: ActionFunctionArgs,
    clientId: string | undefined,
  ): Promise<Response> {
    args.context.get(accessContext).requireAccount({ role: "COACH" });
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      return this.notFoundResponse();
    }

    const part = await receivedAvatarOf(args.request);

    if (part.status !== "received") {
      return unreceivedAvatarResponse(part);
    }

    return avatarWrittenResponse(
      await this.options.uploadClientAvatarAsCoachUseCase.execute({
        clientId: target.data,
        avatar: part.avatar,
      }),
    );
  }

  async remove(
    args: ActionFunctionArgs,
    clientId: string | undefined,
  ): Promise<Response> {
    args.context.get(accessContext).requireAccount({ role: "COACH" });
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      return this.notFoundResponse();
    }

    return avatarWrittenResponse(
      await this.options.removeClientAvatarAsCoachUseCase.execute(target.data),
    );
  }

  async urlsFor(
    args: LoaderFunctionArgs,
    clientIds: readonly string[],
  ): Promise<ClientAvatarUrls> {
    args.context.get(accessContext).requirePortalAccess("COACH");
    const avatars =
      await this.options.listClientAvatarsUseCase.execute(clientIds);
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
