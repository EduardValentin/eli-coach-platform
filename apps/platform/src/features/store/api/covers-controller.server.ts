import { Readable } from "node:stream";

import type { ProductAssetStore, StoreCatalogService } from "@eli-coach-platform/domain/store";
import { isStoreCoverMimeType } from "@eli-coach-platform/domain/store";

export class StoreCoverAssetController {
  constructor(
    private readonly catalogService: StoreCatalogService,
    private readonly assetStore: ProductAssetStore,
  ) {}

  async getCover(assetKey: string): Promise<Response> {
    const result =
      await this.catalogService.getPublishedCoverByAssetKey(assetKey);

    if (result.status === "not_found") {
      return new Response("Not Found", { status: 404 });
    }

    if (result.status === "unavailable") {
      return new Response("Store cover unavailable", { status: 503 });
    }

    if (!isStoreCoverMimeType(result.cover.mimeType)) {
      return new Response("Store cover unavailable", { status: 503 });
    }

    const opened = await this.assetStore.openVerified(result.cover);

    if (opened.kind === "unavailable") {
      return new Response("Store cover unavailable", { status: 503 });
    }

    return new Response(
      Readable.toWeb(Readable.from(opened.bytes)) as ReadableStream<Uint8Array>,
      {
        headers: {
          "Cache-Control":
            "public, max-age=3600, stale-while-revalidate=86400",
          "Content-Security-Policy": "sandbox; default-src 'none'",
          "Content-Length": String(result.cover.sizeBytes),
          "Content-Type": result.cover.mimeType,
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
}
