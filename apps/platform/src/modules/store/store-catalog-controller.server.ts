import { joinBasePath } from "@eli-coach-platform/config";
import {
  storeCatalogResponseSchema,
  storeProductSchema,
  type StoreProduct,
} from "@eli-coach-platform/contracts";
import type {
  PublishedStoreProduct,
  StoreCatalogService,
} from "@eli-coach-platform/domain";

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
          this.toStoreProduct(product),
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

    return Response.json(this.toStoreProduct(result.product));
  }

  private toStoreProduct(product: PublishedStoreProduct): StoreProduct {
    return storeProductSchema.parse({
      cardSummary: product.version.cardSummary,
      cover: {
        alt: product.version.cover.alt,
        url: joinBasePath(
          this.options.appBasePath,
          `/api/store/covers/${encodeURIComponent(
            product.version.cover.assetKey,
          )}`,
        ),
      },
      creatorName: product.version.creatorName,
      detailDescription: product.version.detailDescription,
      goals: product.version.goals,
      includedItems: product.version.includedItems,
      slug: product.slug,
      title: product.version.title,
      types: product.version.types,
    });
  }
}
