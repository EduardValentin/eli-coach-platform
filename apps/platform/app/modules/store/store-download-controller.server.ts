import { basename } from "node:path";
import { Readable } from "node:stream";

import { storeDownloadRequestSchema } from "@eli-coach-platform/contracts";
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
  const responseBody = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${options.title}</title>
    <style>
      body { margin: 0; background: #f8f6f4; color: #17212f; font-family: system-ui, sans-serif; }
      main { box-sizing: border-box; max-width: 42rem; margin: 0 auto; padding: 5rem 1.5rem; text-align: center; }
      h1 { font-family: Georgia, serif; font-size: clamp(2rem, 6vw, 3rem); font-weight: 500; }
      p { color: #5d6673; font-size: 1.05rem; line-height: 1.6; }
      a { display: inline-flex; min-height: 44px; align-items: center; margin-top: 1.5rem; border-radius: 999px; background: #17212f; color: white; padding: 0 1.75rem; font-weight: 600; text-decoration: none; }
      a:focus-visible { outline: 3px solid #c81d6b; outline-offset: 3px; }
    </style>
  </head>
  <body>
    <main aria-labelledby="download-unavailable-heading">
      <h1 id="download-unavailable-heading">${options.heading}</h1>
      <p>${options.message}</p>
      <a href="${storeUrl}">Back to the store</a>
    </main>
  </body>
</html>`;

  return new Response(responseBody, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
    status: options.status,
  });
}
