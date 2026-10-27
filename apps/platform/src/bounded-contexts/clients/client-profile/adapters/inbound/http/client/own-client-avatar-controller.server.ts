import type {
  ReadOwnClientAvatarUseCase,
  RemoveOwnClientAvatarUseCase,
  UploadOwnClientAvatarUseCase,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { requireApiAccount } from "~/bounded-contexts/access/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/bounded-contexts/access/accounts/server/guards/require-portal-access.server";
import {
  avatarWrittenResponse,
  receivedAvatarOf,
  unreceivedAvatarResponse,
} from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/client-avatar-transport.server";
import {
  clientAvatarUrlSchema,
  type ClientAvatarUrl,
} from "~/bounded-contexts/clients/client-profile/public/client-avatar";
import { clientAvatarPath } from "~/bounded-contexts/clients/client-profile/public/paths";

type OwnClientAvatarControllerOptions = {
  readOwnClientAvatar: ReadOwnClientAvatarUseCase;
  removeOwnClientAvatar: RemoveOwnClientAvatarUseCase;
  uploadOwnClientAvatar: UploadOwnClientAvatarUseCase;
};

export class OwnClientAvatarController {
  constructor(private readonly options: OwnClientAvatarControllerOptions) {}

  async upload(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });
    const part = await receivedAvatarOf(args.request);

    if (part.status !== "received") {
      return unreceivedAvatarResponse(part);
    }

    return avatarWrittenResponse(
      await this.options.uploadOwnClientAvatar.execute({
        authSubjectId: client.authSubjectId,
        avatar: part.avatar,
      }),
    );
  }

  async remove(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });

    return avatarWrittenResponse(
      await this.options.removeOwnClientAvatar.execute(client.authSubjectId),
    );
  }

  async url(args: LoaderFunctionArgs): Promise<ClientAvatarUrl> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const avatar = await this.options.readOwnClientAvatar.execute(
      client.authSubjectId,
    );

    return clientAvatarUrlSchema.parse(
      avatar ? clientAvatarPath(avatar) : null,
    );
  }
}
