import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import {
  MAX_RESOURCE_FILE_BYTES,
  type AddClientResourceResult,
  type AddClientResourceUseCase,
  type ChangeResourceDetailsUseCase,
  type DownloadClientResourceUseCase,
  type OpenResourcePreviewUseCase,
  type RemoveClientResourceUseCase,
  type ResourcePreview,
  type ResourceRequester,
} from "@eli-coach-platform/domain/client-resources";
import {
  createBadRequestResponse,
  createPrivateInlineFileResponse,
  createSandboxedAttachmentResponse,
  readFormDataRequestBody,
  readTextRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import {
  addedResourceAnswerSchema,
  changedResourceAnswerSchema,
  presentClientResource,
  refusedResourceAnswerSchema,
  removedResourceAnswerSchema,
  resourceDetailsProblemsAnswerSchema,
  resourceDetailsRequestSchema,
} from "~/features/client-resources/public/client-resources";
import { receivedResourceUploadOf } from "~/features/client-resources/public/resource-upload-parts";

type ClientResourcesControllerOptions = {
  addClientResource: AddClientResourceUseCase;
  openResourcePreview: OpenResourcePreviewUseCase;
  downloadClientResource: DownloadClientResourceUseCase;
  changeResourceDetails: ChangeResourceDetailsUseCase;
  removeClientResource: RemoveClientResourceUseCase;
};

const MULTIPART_ALLOWANCE_BYTES = 1024 * 1024;

const RESOURCE_UPLOAD_MAX_BYTES =
  MAX_RESOURCE_FILE_BYTES + MULTIPART_ALLOWANCE_BYTES;

const RESOURCE_DETAILS_MAX_BYTES = 16 * 1024;

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
        refusedResourceAnswerSchema.parse({ refusal: "too-large" }),
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

  async changeDetails(
    args: ActionFunctionArgs,
    resourceId: string | undefined,
  ): Promise<Response> {
    const requester = requireCoach(args);
    const id = idSchema.safeParse(resourceId);

    if (!id.success) {
      return notFoundResponse();
    }

    const details = resourceDetailsRequestSchema.safeParse(
      await this.readJsonBody(args.request),
    );

    if (!details.success) {
      return createBadRequestResponse("The details could not be read.");
    }

    const result = await this.options.changeResourceDetails.execute({
      requester,
      resourceId: id.data,
      details: details.data,
    });

    switch (result.status) {
      case "changed":
        return Response.json(
          changedResourceAnswerSchema.parse({
            resource: presentClientResource(result.resource),
          }),
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
        return serverErrorResponse();
    }
  }

  async remove(
    args: ActionFunctionArgs,
    resourceId: string | undefined,
  ): Promise<Response> {
    const requester = requireCoach(args);
    const id = idSchema.safeParse(resourceId);

    if (!id.success) {
      return notFoundResponse();
    }

    const result = await this.options.removeClientResource.execute({
      requester,
      resourceId: id.data,
    });

    switch (result.status) {
      case "removed":
        return Response.json(
          removedResourceAnswerSchema.parse({ status: "removed" }),
        );
      case "not-found":
        return notFoundResponse();
      case "failed":
        return serverErrorResponse();
    }
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
    const requester = requireAccount(args);
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
      filename: result.downloadName,
      mimeType: result.mimeType,
      sizeBytes: result.sizeBytes,
    });
  }

  private async openPreview(
    args: LoaderFunctionArgs,
    wanted: { resourceId: string | undefined; preview: ResourcePreview | null },
  ): Promise<Response> {
    const requester = requireAccount(args);
    const id = idSchema.safeParse(wanted.resourceId);

    if (!id.success || !wanted.preview) {
      return notFoundResponse();
    }

    const result = await this.options.openResourcePreview.execute({
      requester,
      resourceId: id.data,
      preview: wanted.preview,
    });

    if (result.status === "not-found") {
      return notFoundResponse();
    }

    return createPrivateInlineFileResponse(result.bytes, result.mimeType);
  }

  private async readJsonBody(request: Request): Promise<unknown> {
    const body = await readTextRequestBody(request, {
      maxBytes: RESOURCE_DETAILS_MAX_BYTES,
    });

    if (body.status !== "valid") {
      return undefined;
    }

    try {
      return JSON.parse(body.text);
    } catch {
      return undefined;
    }
  }
}

function requireCoach(args: LoaderFunctionArgs): ResourceRequester {
  return requesterOf(requireApiAccount(args, { role: "COACH" }));
}

function requireAccount(args: LoaderFunctionArgs): ResourceRequester {
  return requesterOf(requireApiAccount(args));
}

function requesterOf(account: AccountSnapshot): ResourceRequester {
  return { role: account.role, authSubjectId: account.authSubjectId };
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
      return serverErrorResponse();
  }
}

function notFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}

function serverErrorResponse(): Response {
  return new Response("Internal Server Error", { status: 500 });
}
