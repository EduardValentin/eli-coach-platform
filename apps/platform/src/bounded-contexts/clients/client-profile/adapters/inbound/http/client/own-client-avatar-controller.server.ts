import type {
  ReadOwnClientAvatarUseCase,
  RemoveOwnClientAvatarUseCase,
  UploadOwnClientAvatarUseCase,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

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
import { accessContext } from "~/bounded-contexts/access/public/session";

type OwnClientAvatarControllerOptions = {
  readOwnClientAvatarUseCase: ReadOwnClientAvatarUseCase;
  removeOwnClientAvatarUseCase: RemoveOwnClientAvatarUseCase;
  uploadOwnClientAvatarUseCase: UploadOwnClientAvatarUseCase;
};

export class OwnClientAvatarController {
  constructor(private readonly options: OwnClientAvatarControllerOptions) {}

  async upload(args: ActionFunctionArgs): Promise<Response> {
    const client = args.context
      .get(accessContext)
      .requireAccount({ role: "CLIENT" });
    const part = await receivedAvatarOf(args.request);

    if (part.status !== "received") {
      return unreceivedAvatarResponse(part);
    }

    return avatarWrittenResponse(
      await this.options.uploadOwnClientAvatarUseCase.execute({
        authSubjectId: client.authSubjectId,
        avatar: part.avatar,
      }),
    );
  }

  async remove(args: ActionFunctionArgs): Promise<Response> {
    const client = args.context
      .get(accessContext)
      .requireAccount({ role: "CLIENT" });

    return avatarWrittenResponse(
      await this.options.removeOwnClientAvatarUseCase.execute(
        client.authSubjectId,
      ),
    );
  }

  async url(args: LoaderFunctionArgs): Promise<ClientAvatarUrl> {
    const client = args.context
      .get(accessContext)
      .requirePortalAccess("CLIENT");
    const avatar = await this.options.readOwnClientAvatarUseCase.execute(
      client.authSubjectId,
    );

    return clientAvatarUrlSchema.parse(
      avatar ? clientAvatarPath(avatar) : null,
    );
  }
}
