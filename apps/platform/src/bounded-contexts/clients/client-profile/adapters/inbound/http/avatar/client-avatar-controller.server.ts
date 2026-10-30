import type { OpenClientAvatarUseCase } from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import { createPrivateInlineFileResponse } from "~/shared/http/index.server";
import type { LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import { accessContext } from "~/bounded-contexts/access/public/session";

type ClientAvatarControllerOptions = {
  openClientAvatarUseCase: OpenClientAvatarUseCase;
};

const clientIdSchema = z.uuid();

export class ClientAvatarController {
  constructor(private readonly options: ClientAvatarControllerOptions) {}

  async open(
    args: LoaderFunctionArgs,
    clientId: string | undefined,
  ): Promise<Response> {
    const account = args.context.get(accessContext).requireAccount();
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      return this.notFoundResponse();
    }

    const result = await this.options.openClientAvatarUseCase.execute({
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
