import { Readable } from "node:stream";

import type {
  VerifiedFileReader,
  StoreCatalogService,
} from "@eli-coach-platform/domain";
import { isStoreCoverMimeType } from "@eli-coach-platform/domain";

export class StoreCoverAssetController {
  constructor(
    private readonly catalogService: StoreCatalogService,
    private readonly assetStore: VerifiedFileReader,
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

    let stream: NodeJS.ReadableStream;

    try {
      stream = await this.assetStore.openVerified(result.cover);
    } catch {
      return new Response("Store cover unavailable", { status: 503 });
    }

    return new Response(
      Readable.toWeb(stream as Readable) as ReadableStream<Uint8Array>,
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
