import type { OpenClientAvatarUseCase } from "@eli-coach-platform/domain/client-profile";
import { createPrivateInlineFileResponse } from "@eli-coach-platform/infrastructure/http/server";
import type { LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requireApiAccount } from "~/bounded-contexts/access/accounts/server/guards/require-account.server";

type ClientAvatarControllerOptions = {
  openClientAvatar: OpenClientAvatarUseCase;
};

const clientIdSchema = z.uuid();

export class ClientAvatarController {
  constructor(private readonly options: ClientAvatarControllerOptions) {}

  async open(
    args: LoaderFunctionArgs,
    clientId: string | undefined,
  ): Promise<Response> {
    const account = requireApiAccount(args);
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      return this.notFoundResponse();
    }

    const result = await this.options.openClientAvatar.execute({
      clientId: target.data,
      requester: { role: account.role, authSubjectId: account.authSubjectId },
    });

    return result.status === "opened"
      ? createPrivateInlineFileResponse(result.bytes, result.mimeType)
      : this.notFoundResponse();
  }

  private notFoundResponse(): Response {
    return new Response("Not Found", { status: 404 });
  }
}
