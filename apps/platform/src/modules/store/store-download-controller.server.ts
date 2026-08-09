import { basename } from "node:path";
import { Readable } from "node:stream";

import { joinBasePath } from "@eli-coach-platform/config";
import {
  ProductAssetUnavailableError,
  type DownloadGrant,
  type DownloadGrantResolution,
  type DownloadGrantService,
  type ProductAsset,
  type ProductAssetStore,
} from "@eli-coach-platform/domain";
import { readFormDataRequestBody } from "~/server/http.server";
import { storeDownloadRequestSchema } from "~/features/store/contracts/store";

import recoveryDocument from "./store-download-recovery.html?raw";

type ZipDeliveryStream = {
  create(grant: DownloadGrant): Promise<NodeJS.ReadableStream>;
};

const MAX_DOWNLOAD_BODY_BYTES = 4 * 1024;

export class StoreDownloadController {
  constructor(
    private readonly grantService: DownloadGrantService,
    private readonly assetStore: ProductAssetStore,
    private readonly options: {
      appBasePath: string;
      zipDeliveryStream: ZipDeliveryStream;
    },
  ) {}

  async download(request: Request): Promise<Response> {
    const requestBody = await readFormDataRequestBody(request, {
      maxBytes: MAX_DOWNLOAD_BODY_BYTES,
    });

    if (requestBody.status !== "valid") {
      return createDownloadRecoveryResponse({
        appBasePath: this.options.appBasePath,
        heading: "This download request could not be processed",
        message:
          "Return to the store and request your free resources again.",
        status: requestBody.status === "too_large" ? 413 : 400,
        title: "Download request unavailable",
      });
    }

    const formData = requestBody.formData;
    const parsedRequest = storeDownloadRequestSchema.safeParse({
      token: formData.get("token"),
    });

    if (!parsedRequest.success) {
      return createUnavailableResponse();
    }

    let resolution: DownloadGrantResolution;

    try {
      resolution = await this.grantService.resolve(
        parsedRequest.data.token,
      );
    } catch {
      return createTemporaryUnavailableResponse(
        this.options.appBasePath,
      );
    }

    try {
      if (resolution.status === "unavailable") {
        return createUnavailableResponse();
      }

      if (
        resolution.grant.items.length === 0 ||
        resolution.grant.items.some((item) => item.assets.length === 0)
      ) {
        return createUnavailableResponse();
      }

      const assets = resolution.grant.items.flatMap((item) => item.assets);

      if (assets.length === 1) {
        return await this.streamSingleAsset(assets[0]!);
      }

      const stream = await this.options.zipDeliveryStream.create(
        resolution.grant,
      );

      return createStreamResponse(stream, {
        filename: "eli-resources.zip",
        mimeType: "application/zip",
      });
    } catch (error) {
      return error instanceof ProductAssetUnavailableError
        ? createUnavailableResponse()
        : createTemporaryUnavailableResponse(this.options.appBasePath);
    }
  }

  private async streamSingleAsset(asset: ProductAsset): Promise<Response> {
    const stream = await this.assetStore.openVerified(asset);

    return createStreamResponse(stream, {
      filename: basename(asset.customerFilename),
      mimeType: asset.mimeType,
    });
  }
}

function createStreamResponse(
  stream: NodeJS.ReadableStream,
  options: { filename: string; mimeType: string },
): Response {
  return new Response(
    Readable.toWeb(stream as Readable) as ReadableStream<Uint8Array>,
    {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": createContentDisposition(options.filename),
        "Content-Type": options.mimeType,
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function createContentDisposition(filename: string): string {
  const safeFilename = filename
    .replace(/[\r\n"]/g, "")
    .replace(/[^\x20-\x7e]/g, "_");

  return `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(
    filename,
  )}`;
}

function createUnavailableResponse(): Response {
  return new Response(null, {
    headers: {
      "Cache-Control": "no-store",
      Location: "/store/download?unavailable=1",
    },
    status: 303,
  });
}

function createTemporaryUnavailableResponse(
  appBasePath: string,
): Response {
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
  const storeUrl = joinBasePath(options.appBasePath, "/store");
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
