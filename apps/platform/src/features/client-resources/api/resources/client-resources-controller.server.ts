import {
  MAX_RESOURCE_FILE_BYTES,
  type AddClientResourceResult,
  type AddClientResourceUseCase,
  type DownloadClientResourceUseCase,
  type OpenResourcePageUseCase,
  type ResourcePreview,
  type ResourceRequester,
} from "@eli-coach-platform/domain/client-resources";
import {
  createBadRequestResponse,
  createPrivateInlineFileResponse,
  createSandboxedAttachmentResponse,
  readFormDataRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import {
  addedResourceAnswerSchema,
  presentClientResource,
  refusedResourceAnswerSchema,
  resourceDetailsProblemsAnswerSchema,
} from "~/features/client-resources/contracts/client-resources";
import { receivedResourceUploadOf } from "~/features/client-resources/contracts/resource-upload-parts";

type ClientResourcesControllerOptions = {
  addClientResource: AddClientResourceUseCase;
  openResourcePage: OpenResourcePageUseCase;
  downloadClientResource: DownloadClientResourceUseCase;
};

const MULTIPART_ALLOWANCE_BYTES = 1024 * 1024;

const RESOURCE_UPLOAD_MAX_BYTES =
  MAX_RESOURCE_FILE_BYTES + MULTIPART_ALLOWANCE_BYTES;

const idSchema = z.uuid();

const pageNumberSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().max(Number.MAX_SAFE_INTEGER));

export class ClientResourcesController {
  constructor(private readonly options: ClientResourcesControllerOptions) {}

  async add(
    args: ActionFunctionArgs,
    clientId: string | undefined,
  ): Promise<Response> {
    const requester = requireCoach(args);
    const target = idSchema.safeParse(clientId);

    if (!target.success) {
      return notFoundResponse();
    }

    const body = await readFormDataRequestBody(args.request, {
      maxBytes: RESOURCE_UPLOAD_MAX_BYTES,
    });

    if (body.status === "too_large") {
      return Response.json(
        { message: "The file is too large to send." },
        { status: 413 },
      );
    }

    const upload =
      body.status === "valid"
        ? await receivedResourceUploadOf(body.formData)
        : null;

    if (!upload) {
      return createBadRequestResponse("The resource could not be read.");
    }

    const result = await this.options.addClientResource.execute({
      requester,
      clientId: target.data,
      ...upload,
    });

    return addingResponse(result);
  }

  async openPage(
    args: LoaderFunctionArgs,
    resourceId: string | undefined,
    pageNumber: string | undefined,
  ): Promise<Response> {
    const page = pageNumberSchema.safeParse(pageNumber);

    return this.openPreview(args, {
      resourceId,
      preview: page.success ? { kind: "page", pageNumber: page.data } : null,
    });
  }

  async openThumbnail(
    args: LoaderFunctionArgs,
    resourceId: string | undefined,
  ): Promise<Response> {
    return this.openPreview(args, {
      resourceId,
      preview: { kind: "thumbnail" },
    });
  }

  async download(
    args: LoaderFunctionArgs,
    resourceId: string | undefined,
  ): Promise<Response> {
    const requester = requireCoach(args);
    const id = idSchema.safeParse(resourceId);

    if (!id.success) {
      return notFoundResponse();
    }

    const result = await this.options.downloadClientResource.execute({
      requester,
      resourceId: id.data,
    });

    if (result.status === "not-found") {
      return notFoundResponse();
    }

    return createSandboxedAttachmentResponse(result.bytes, {
      filename: result.originalName,
      mimeType: result.mimeType,
      byteLength: result.sizeBytes,
    });
  }

  private async openPreview(
    args: LoaderFunctionArgs,
    wanted: { resourceId: string | undefined; preview: ResourcePreview | null },
  ): Promise<Response> {
    const requester = requireCoach(args);
    const id = idSchema.safeParse(wanted.resourceId);

    if (!id.success || !wanted.preview) {
      return notFoundResponse();
    }

    const result = await this.options.openResourcePage.execute({
      requester,
      resourceId: id.data,
      preview: wanted.preview,
    });

    if (result.status === "not-found") {
      return notFoundResponse();
    }

    return createPrivateInlineFileResponse(result.bytes, result.mimeType);
  }
}

function requireCoach(args: LoaderFunctionArgs): ResourceRequester {
  const coach = requireApiAccount(args, { role: "COACH" });

  return { role: coach.role, authSubjectId: coach.authSubjectId };
}

function addingResponse(result: AddClientResourceResult): Response {
  switch (result.status) {
    case "added":
      return Response.json(
        addedResourceAnswerSchema.parse({
          resource: presentClientResource(result.resource),
        }),
        { status: 201 },
      );
    case "refused":
      return Response.json(
        refusedResourceAnswerSchema.parse({ refusal: result.refusal }),
        { status: 422 },
      );
    case "invalid-details":
      return Response.json(
        resourceDetailsProblemsAnswerSchema.parse({
          problems: result.problems,
        }),
        { status: 400 },
      );
    case "not-found":
      return notFoundResponse();
    case "failed":
      return new Response("Internal Server Error", { status: 500 });
  }
}

function notFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
