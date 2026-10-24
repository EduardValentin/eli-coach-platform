import type {
  ListClientAvatarsUseCase,
  OpenClientAvatarUseCase,
  ReadOwnClientAvatarUseCase,
  ReceivedClientAvatar,
  RemoveClientAvatarAsCoachUseCase,
  RemoveOwnClientAvatarUseCase,
  UploadClientAvatarAsCoachUseCase,
  UploadOwnClientAvatarUseCase,
} from "@eli-coach-platform/domain/client-profile";
import {
  createBadRequestResponse,
  createPrivateInlineFileResponse,
  readFormDataRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  CLIENT_AVATAR_FIELD,
  clientAvatarRefusalSchema,
  clientAvatarUrlSchema,
  clientAvatarUrlsSchema,
  clientAvatarWrittenAnswerSchema,
  type ClientAvatarRefusal,
  type ClientAvatarUrl,
  type ClientAvatarUrls,
} from "~/features/client-profile/public/client-avatar";
import { clientAvatarPath } from "~/features/client-profile/public/paths";

type ClientAvatarControllerOptions = {
  listClientAvatars: ListClientAvatarsUseCase;
  openClientAvatar: OpenClientAvatarUseCase;
  readOwnClientAvatar: ReadOwnClientAvatarUseCase;
  removeClientAvatarAsCoach: RemoveClientAvatarAsCoachUseCase;
  removeOwnClientAvatar: RemoveOwnClientAvatarUseCase;
  uploadClientAvatarAsCoach: UploadClientAvatarAsCoachUseCase;
  uploadOwnClientAvatar: UploadOwnClientAvatarUseCase;
};

type AvatarWriteResult = Awaited<
  ReturnType<
    | UploadOwnClientAvatarUseCase["execute"]
    | UploadClientAvatarAsCoachUseCase["execute"]
    | RemoveOwnClientAvatarUseCase["execute"]
    | RemoveClientAvatarAsCoachUseCase["execute"]
  >
>;

type ReceivedAvatarPart =
  | { status: "received"; avatar: ReceivedClientAvatar }
  | { status: "unreadable" }
  | { status: "too-large" };

const clientIdSchema = z.uuid();

const AVATAR_REQUEST_MAX_BYTES = 32 * 1024 * 1024;

const REFUSAL_STATUS: Record<ClientAvatarRefusal["error"], number> = {
  "not-found": 404,
  "not-on-journey": 404,
  ended: 409,
  "not-accepted": 422,
  "rendition-refused": 422,
  "too-large": 413,
};

export class ClientAvatarController {
  constructor(private readonly options: ClientAvatarControllerOptions) {}

  async open(
    args: LoaderFunctionArgs,
    clientId: string | undefined,
  ): Promise<Response> {
    const account = requireApiAccount(args);
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      return notFoundResponse();
    }

    const result = await this.options.openClientAvatar.execute({
      clientId: target.data,
      requester: { role: account.role, authSubjectId: account.authSubjectId },
    });

    return result.status === "opened"
      ? createPrivateInlineFileResponse(result.bytes, result.mimeType)
      : notFoundResponse();
  }

  async uploadOwn(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });
    const part = await this.receivedAvatarOf(args.request);

    if (part.status !== "received") {
      return this.unreceivedResponse(part);
    }

    return this.writtenResponse(
      await this.options.uploadOwnClientAvatar.execute({
        authSubjectId: client.authSubjectId,
        avatar: part.avatar,
      }),
    );
  }

  async removeOwn(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });

    return this.writtenResponse(
      await this.options.removeOwnClientAvatar.execute(client.authSubjectId),
    );
  }

  async uploadAsCoach(
    args: ActionFunctionArgs,
    clientId: string | undefined,
  ): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      return notFoundResponse();
    }

    const part = await this.receivedAvatarOf(args.request);

    if (part.status !== "received") {
      return this.unreceivedResponse(part);
    }

    return this.writtenResponse(
      await this.options.uploadClientAvatarAsCoach.execute({
        clientId: target.data,
        avatar: part.avatar,
      }),
    );
  }

  async removeAsCoach(
    args: ActionFunctionArgs,
    clientId: string | undefined,
  ): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      return notFoundResponse();
    }

    return this.writtenResponse(
      await this.options.removeClientAvatarAsCoach.execute(target.data),
    );
  }

  async urlsFor(
    args: LoaderFunctionArgs,
    clientIds: readonly string[],
  ): Promise<ClientAvatarUrls> {
    requirePortalAccess(args, { role: "COACH" });
    const avatars = await this.options.listClientAvatars.execute(clientIds);
    const withAvatar = new Set(avatars.map((avatar) => avatar.clientId));

    return clientAvatarUrlsSchema.parse(
      Object.fromEntries(
        clientIds.map((clientId) => [
          clientId,
          withAvatar.has(clientId) ? clientAvatarPath(clientId) : null,
        ]),
      ),
    );
  }

  async ownUrl(args: LoaderFunctionArgs): Promise<ClientAvatarUrl> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const avatar = await this.options.readOwnClientAvatar.execute(
      client.authSubjectId,
    );

    return clientAvatarUrlSchema.parse(
      avatar ? clientAvatarPath(avatar.clientId) : null,
    );
  }

  private async receivedAvatarOf(
    request: Request,
  ): Promise<ReceivedAvatarPart> {
    const body = await readFormDataRequestBody(request, {
      maxBytes: AVATAR_REQUEST_MAX_BYTES,
    });

    if (body.status === "too_large") {
      return { status: "too-large" };
    }

    const part =
      body.status === "valid" ? body.formData.get(CLIENT_AVATAR_FIELD) : null;

    if (!(part instanceof File)) {
      return { status: "unreadable" };
    }

    return {
      status: "received",
      avatar: {
        mimeType: part.type,
        sizeBytes: part.size,
        bytes: new Uint8Array(await part.arrayBuffer()),
      },
    };
  }

  private unreceivedResponse(
    part: Exclude<ReceivedAvatarPart, { status: "received" }>,
  ): Response {
    return part.status === "too-large"
      ? this.refusalResponse("too-large")
      : createBadRequestResponse("The avatar could not be read.");
  }

  private writtenResponse(result: AvatarWriteResult): Response {
    if (result.status === "uploaded" || result.status === "removed") {
      return Response.json(
        clientAvatarWrittenAnswerSchema.parse({ status: result.status }),
      );
    }

    return this.refusalResponse(
      result.status === "refused" ? result.reason : result.status,
    );
  }

  private refusalResponse(error: ClientAvatarRefusal["error"]): Response {
    return Response.json(clientAvatarRefusalSchema.parse({ error }), {
      status: REFUSAL_STATUS[error],
    });
  }
}

function notFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
