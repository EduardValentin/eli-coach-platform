import type { StoreCatalogService } from "@eli-coach-platform/domain";
import { storeCatalogResponseSchema } from "~/features/store/contracts/store";

import { toStoreProduct } from "./store-product-response.server";

type StoreCatalogControllerOptions = {
  appBasePath: string;
};

const UNAVAILABLE_MESSAGE = "The store is temporarily unavailable.";

export class StoreCatalogController {
  constructor(
    private readonly catalogService: StoreCatalogService,
    private readonly options: StoreCatalogControllerOptions,
  ) {}

  async getPublishedCatalog(): Promise<Response> {
    const result = await this.catalogService.getPublishedCatalog();

    if (result.status === "unavailable") {
      return Response.json(
        storeCatalogResponseSchema.parse({
          error: {
            code: "server_error",
            message: UNAVAILABLE_MESSAGE,
          },
          success: false,
        }),
        { status: 503 },
      );
    }

    return Response.json(
      storeCatalogResponseSchema.parse({
        products: result.products.map((product) =>
          toStoreProduct(product, this.options),
        ),
        success: true,
      }),
    );
  }

  async getPublishedProductBySlug(slug: string): Promise<Response> {
    const result =
      await this.catalogService.getPublishedProductBySlug(slug);

    if (result.status === "not_found") {
      return new Response("Not Found", { status: 404 });
    }

    if (result.status === "unavailable") {
      return new Response(UNAVAILABLE_MESSAGE, { status: 503 });
    }

    return Response.json(toStoreProduct(result.product, this.options));
  }
}
