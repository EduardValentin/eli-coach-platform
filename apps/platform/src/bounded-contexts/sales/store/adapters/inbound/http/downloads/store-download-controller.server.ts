import { joinBasePath } from "~/shared/http/base-path";
import type {
  DownloadGrant,
  DownloadGrantResolution,
  ResolveDownloadGrantUseCase,
} from "~/bounded-contexts/sales/store/domain/download-grant";
import type {
  ProductAsset,
  ProductAssetOpenResult,
  ProductAssetsPort,
} from "~/bounded-contexts/sales/store/domain/product";
import {
  createAttachmentResponse,
  readFormDataRequestBody,
} from "~/shared/http/index.server";
import { STORE_PATH } from "~/bounded-contexts/sales/public/paths";
import { STORE_DOWNLOAD_PATH } from "~/bounded-contexts/sales/store/public/paths";
import {
  storeDownloadContentsResponseSchema,
  storeDownloadRequestSchema,
  type StoreDownloadContentsResponse,
} from "~/bounded-contexts/sales/store/public/store";

import recoveryDocument from "./download-recovery.html?raw";

type ZipDeliveryStream = {
  create(grant: DownloadGrant): Promise<ProductAssetOpenResult>;
};

type DownloadTokenRead =
  | { status: "read"; token: string }
  | { status: "unreadable"; httpStatus: 400 | 413 }
  | { status: "malformed" };

const MAX_DOWNLOAD_BODY_BYTES = 4 * 1024;
const PRIVATE_RESPONSE_HEADERS = { "Cache-Control": "no-store" };

export class StoreDownloadController {
  constructor(
    private readonly resolveDownloadGrantUseCase: ResolveDownloadGrantUseCase,
    private readonly productAssetsPort: ProductAssetsPort,
    private readonly options: {
      appBasePath: string;
      zipDeliveryStream: ZipDeliveryStream;
    },
  ) {}

  async download(request: Request): Promise<Response> {
    const tokenRead = await this.readDownloadToken(request);

    if (tokenRead.status === "unreadable") {
      return createDownloadRecoveryResponse({
        appBasePath: this.options.appBasePath,
        heading: "This download request could not be processed",
        message: "Return to the store and request your free resources again.",
        status: tokenRead.httpStatus,
        title: "Download request unavailable",
      });
    }

    if (tokenRead.status === "malformed") {
      return createUnavailableResponse();
    }

    let resolution: DownloadGrantResolution;

    try {
      resolution = await this.resolveDownloadGrantUseCase.execute(
        tokenRead.token,
      );
    } catch {
      return createTemporaryUnavailableResponse(this.options.appBasePath);
    }

    try {
      if (resolution.status === "unavailable") {
        return createUnavailableResponse();
      }

      const delivery = resolution.delivery;

      switch (delivery.kind) {
        case "empty":
          return createUnavailableResponse();
        case "single":
          return await this.streamSingleAsset(delivery.asset);
        case "bundle": {
          const archive = await this.options.zipDeliveryStream.create(
            resolution.grant,
          );

          if (archive.kind === "unavailable") {
            return createUnavailableResponse();
          }

          return createAttachmentResponse(archive.bytes, {
            filename: "eli-resources.zip",
            mimeType: "application/zip",
          });
        }
      }
    } catch {
      return createTemporaryUnavailableResponse(this.options.appBasePath);
    }
  }

  async contents(request: Request): Promise<Response> {
    const tokenRead = await this.readDownloadToken(request);

    if (tokenRead.status === "unreadable") {
      return this.contentsResponse(
        { status: "invalid_request" },
        tokenRead.httpStatus,
      );
    }

    if (tokenRead.status === "malformed") {
      return this.contentsResponse({ status: "unavailable" }, 200);
    }

    let resolution: DownloadGrantResolution;

    try {
      resolution = await this.resolveDownloadGrantUseCase.execute(
        tokenRead.token,
      );
    } catch {
      return this.contentsResponse({ status: "temporarily_unavailable" }, 503);
    }

    if (
      resolution.status === "unavailable" ||
      resolution.delivery.kind === "empty"
    ) {
      return this.contentsResponse({ status: "unavailable" }, 200);
    }

    return this.contentsResponse(
      {
        status: "available",
        resources: resolution.grant.items.map((item) => ({
          title: item.productTitle,
          typeLabels: [...item.productTypeLabels],
        })),
      },
      200,
    );
  }

  private async readDownloadToken(
    request: Request,
  ): Promise<DownloadTokenRead> {
    const requestBody = await readFormDataRequestBody(request, {
      maxBytes: MAX_DOWNLOAD_BODY_BYTES,
    });

    if (requestBody.status !== "valid") {
      return {
        status: "unreadable",
        httpStatus: requestBody.status === "too_large" ? 413 : 400,
      };
    }

    const parsedRequest = storeDownloadRequestSchema.safeParse(
      Object.fromEntries(requestBody.formData),
    );

    return parsedRequest.success
      ? { status: "read", token: parsedRequest.data.token }
      : { status: "malformed" };
  }

  private contentsResponse(
    answer: StoreDownloadContentsResponse,
    status: number,
  ): Response {
    return Response.json(storeDownloadContentsResponseSchema.parse(answer), {
      headers: PRIVATE_RESPONSE_HEADERS,
      status,
    });
  }

  private async streamSingleAsset(asset: ProductAsset): Promise<Response> {
    const opened = await this.productAssetsPort.openVerified(asset);

    if (opened.kind === "unavailable") {
      return createUnavailableResponse();
    }

    return createAttachmentResponse(opened.bytes, {
      filename: asset.customerFilename,
      mimeType: asset.mimeType,
    });
  }
}

function createUnavailableResponse(): Response {
  return new Response(null, {
    headers: {
      "Cache-Control": "no-store",
      Location: `${STORE_DOWNLOAD_PATH}?unavailable=1`,
    },
    status: 303,
  });
}

function createTemporaryUnavailableResponse(appBasePath: string): Response {
  return createDownloadRecoveryResponse({
    appBasePath,
    heading: "Downloads are temporarily unavailable",
    message:
      "Your link may still be active. Please wait a moment and try again.",
    status: 503,
    title: "Downloads temporarily unavailable",
  });
}

function createDownloadRecoveryResponse(options: {
  appBasePath: string;
  heading: string;
  message: string;
  status: number;
  title: string;
}): Response {
  const storeUrl = joinBasePath(options.appBasePath, STORE_PATH);
  const responseBody = recoveryDocument
    .replaceAll("{{TITLE}}", escapeHtml(options.title))
    .replaceAll("{{HEADING}}", escapeHtml(options.heading))
    .replaceAll("{{MESSAGE}}", escapeHtml(options.message))
    .replaceAll("{{STORE_URL}}", escapeHtml(storeUrl));

  return new Response(responseBody, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
    status: options.status,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
