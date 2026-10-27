import type {
  OpenProgressPhotoUseCase,
  RemoveProgressPhotoUseCase,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import { createPrivateInlineFileResponse } from "~/shared/http/index.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import { accessContext } from "~/bounded-contexts/access/public/session";

type ProgressPhotoControllerOptions = {
  openProgressPhoto: OpenProgressPhotoUseCase;
  removeProgressPhoto: RemoveProgressPhotoUseCase;
};

const photoIdSchema = z.uuid();

export class ProgressPhotoController {
  constructor(private readonly options: ProgressPhotoControllerOptions) {}

  async open(
    args: LoaderFunctionArgs,
    photoId: string | undefined,
  ): Promise<Response> {
    const account = args.context.get(accessContext).requireAccount();
    const id = photoIdSchema.safeParse(photoId);

    if (!id.success) {
      return notFoundResponse();
    }

    const result = await this.options.openProgressPhoto.execute({
      photoId: id.data,
      requester: { role: account.role, authSubjectId: account.authSubjectId },
    });

    if (result.status === "not-found") {
      return notFoundResponse();
    }

    return createPrivateInlineFileResponse(result.bytes, result.mimeType);
  }

  async remove(
    args: ActionFunctionArgs,
    photoId: string | undefined,
  ): Promise<Response> {
    const account = args.context.get(accessContext).requireAccount();
    const id = photoIdSchema.safeParse(photoId);

    if (!id.success) {
      return notFoundResponse();
    }

    const result = await this.options.removeProgressPhoto.execute({
      photoId: id.data,
      requester: { role: account.role, authSubjectId: account.authSubjectId },
    });

    if (result.status === "not-found") {
      return notFoundResponse();
    }

    return new Response(null, { status: 204 });
  }
}

function notFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
