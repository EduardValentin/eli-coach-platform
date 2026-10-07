import type {
  OpenProgressPhotoUseCase,
  RemoveProgressPhotoUseCase,
} from "@eli-coach-platform/domain/client-profile";
import { createPrivateInlineFileResponse } from "@eli-coach-platform/infrastructure/http/server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";

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
    const account = requireApiAccount(args);
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
    const account = requireApiAccount(args);
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
