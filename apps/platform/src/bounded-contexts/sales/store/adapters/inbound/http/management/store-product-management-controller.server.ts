import {
  MAX_PUBLICATION_BYTES,
  type ChangeProductPriceUseCase,
  type PlanNewProductUseCase,
  type PlanProductRevisionUseCase,
  type ProductCoverInput,
  type ProductDownloadInput,
  type ProductVersionMetadata,
  type PublicationIssue,
  type PublicationPlanResult,
  type PublishingPrincipal,
  type PublishNewProductUseCase,
  type PublishProductResult,
  type PublishProductVersionUseCase,
  type RetireProductUseCase,
} from "~/bounded-contexts/sales/store/domain/product";
import type {
  ManagementAuthenticatorPort,
  ManagementAuthConfig,
} from "~/bounded-contexts/sales/store/adapters/inbound/http/management/management-auth/management-authenticator-port.server";
import { isSecureManagementTransport } from "~/bounded-contexts/sales/store/adapters/inbound/http/management/management-auth/management-auth-config.server";

import {
  newProductMetadataSchema,
  productPriceChangeSchema,
  productValidationMetadataSchema,
  productVersionMetadataSchema,
} from "~/bounded-contexts/sales/store/public/store-management";
import {
  readFormDataRequestBody,
  readTextRequestBody,
} from "~/shared/http/index.server";

const MAX_PRICE_CHANGE_BODY_BYTES = 4 * 1024;

type StoreProductManagementControllerOptions = {
  authConfig: ManagementAuthConfig;
  changeProductPriceUseCase: ChangeProductPriceUseCase;
  managementAuthenticatorPort: ManagementAuthenticatorPort;
  planNewProductUseCase: PlanNewProductUseCase;
  planProductRevisionUseCase: PlanProductRevisionUseCase;
  publishNewProductUseCase: PublishNewProductUseCase;
  publishProductVersionUseCase: PublishProductVersionUseCase;
  retireProductUseCase: RetireProductUseCase;
};

type AuthorizedRequest =
  | { status: "authorized"; principal: PublishingPrincipal }
  | { status: "rejected"; response: Response };

type ParsedPayload<Metadata> = {
  cover: ProductCoverInput;
  downloads: readonly ProductDownloadInput[];
  metadata: Metadata;
};

type PayloadParse<Metadata> =
  | { status: "parsed"; payload: ParsedPayload<Metadata> }
  | { status: "rejected"; response: Response };

type PriceChangeBody = ReturnType<typeof productPriceChangeSchema.parse>;

type PriceChangeParse =
  | { status: "parsed"; body: PriceChangeBody }
  | { status: "rejected"; response: Response };

export class StoreProductManagementController {
  constructor(
    private readonly options: StoreProductManagementControllerOptions,
  ) {}

  async validate(request: Request): Promise<Response> {
    const authorized = await this.authorize(request);

    if (authorized.status === "rejected") {
      return authorized.response;
    }

    const parsed = await this.parsePayload(
      request,
      productValidationMetadataSchema,
    );

    if (parsed.status === "rejected") {
      return parsed.response;
    }

    const { cover, downloads, metadata } = parsed.payload;
    const domainMetadata = toDomainMetadata(metadata);
    const result: PublicationPlanResult =
      "targetProductSlug" in metadata
        ? await this.options.planProductRevisionUseCase.execute({
            cover,
            downloads,
            metadata: domainMetadata,
            productSlug: metadata.targetProductSlug,
          })
        : await this.options.planNewProductUseCase.execute({
            cover,
            downloads,
            metadata: domainMetadata,
            pricing: metadata.pricing,
            slug: metadata.slug,
          });

    if (result.status === "unavailable") {
      return errorResponse(
        "server_error",
        "Store management is temporarily unavailable.",
        503,
      );
    }

    if (result.status === "invalid") {
      return validationFailureResponse(result.issues);
    }

    return Response.json({ success: true, plan: result.plan }, { status: 200 });
  }

  async publishProduct(request: Request): Promise<Response> {
    const authorized = await this.authorize(request);

    if (authorized.status === "rejected") {
      return authorized.response;
    }

    const parsed = await this.parsePayload(request, newProductMetadataSchema);

    if (parsed.status === "rejected") {
      return parsed.response;
    }

    const { cover, downloads, metadata } = parsed.payload;

    return publicationResponse(
      await this.options.publishNewProductUseCase.execute({
        cover,
        downloads,
        idempotencyKey: metadata.idempotencyKey,
        metadata: toDomainMetadata(metadata),
        pricing: metadata.pricing,
        publishedBy: authorized.principal,
        slug: metadata.slug,
      }),
    );
  }

  async publishProductVersion(
    request: Request,
    productIdParameter: string | undefined,
  ): Promise<Response> {
    const authorized = await this.authorize(request);

    if (authorized.status === "rejected") {
      return authorized.response;
    }

    const productId = parseProductId(productIdParameter);

    if (productId === null) {
      return errorResponse("not_found", "Unknown product.", 404);
    }

    const parsed = await this.parsePayload(
      request,
      productVersionMetadataSchema,
    );

    if (parsed.status === "rejected") {
      return parsed.response;
    }

    const { cover, downloads, metadata } = parsed.payload;

    return publicationResponse(
      await this.options.publishProductVersionUseCase.execute({
        cover,
        downloads,
        idempotencyKey: metadata.idempotencyKey,
        metadata: toDomainMetadata(metadata),
        productId,
        publishedBy: authorized.principal,
      }),
    );
  }

  async changeProductPrice(
    request: Request,
    productIdParameter: string | undefined,
  ): Promise<Response> {
    const authorized = await this.authorize(request);

    if (authorized.status === "rejected") {
      return authorized.response;
    }

    const productId = parseProductId(productIdParameter);

    if (productId === null) {
      return errorResponse("not_found", "Unknown product.", 404);
    }

    const parsed = await this.parsePriceChange(request);

    if (parsed.status === "rejected") {
      return parsed.response;
    }

    return this.priceChangeResponse(
      await this.options.changeProductPriceUseCase.execute({
        idempotencyKey: parsed.body.idempotencyKey,
        pricing: parsed.body.pricing,
        productId,
        publishedBy: authorized.principal,
      }),
      parsed.body.pricing,
    );
  }

  async retireProduct(
    request: Request,
    productIdParameter: string | undefined,
  ): Promise<Response> {
    const authorized = await this.authorize(request);

    if (authorized.status === "rejected") {
      return authorized.response;
    }

    const productId = parseProductId(productIdParameter);

    if (productId === null) {
      return errorResponse("not_found", "Unknown product.", 404);
    }

    const result = await this.options.retireProductUseCase.execute(productId);

    if (result.status === "unavailable") {
      return errorResponse(
        "server_error",
        "Store management is temporarily unavailable.",
        503,
      );
    }

    if (result.status === "not_found") {
      return errorResponse("not_found", "Unknown product.", 404);
    }

    return Response.json(
      {
        success: true,
        product: { id: result.productId, lifecycleStatus: "archived" },
      },
      { status: 200 },
    );
  }

  /**
   * Transport and credentials are settled before the body is touched, so an
   * unauthenticated caller can never make the server buffer an upload.
   */
  private async authorize(request: Request): Promise<AuthorizedRequest> {
    if (
      this.options.authConfig.transportPolicy === "https_required" &&
      !isSecureManagementTransport(request)
    ) {
      return {
        status: "rejected",
        response: errorResponse(
          "insecure_transport",
          "Store management requires HTTPS.",
          403,
        ),
      };
    }

    const result = await this.options.managementAuthenticatorPort.authenticate({
      authorizationHeader: request.headers.get("authorization"),
    });

    if (result.status === "authenticated") {
      return { status: "authorized", principal: result.principal };
    }

    if (result.status === "forbidden") {
      return {
        status: "rejected",
        response: errorResponse(
          "forbidden",
          "This principal may not manage Store products.",
          403,
        ),
      };
    }

    if (result.status === "unavailable") {
      return {
        status: "rejected",
        response: errorResponse(
          "auth_unavailable",
          "Store management authentication is temporarily unavailable.",
          503,
        ),
      };
    }

    return {
      status: "rejected",
      response: errorResponse(
        "unauthorized",
        "Store management requires a valid credential.",
        401,
      ),
    };
  }

  private priceChangeResponse(
    result: PublishProductResult,
    pricing: PriceChangeBody["pricing"],
  ): Response {
    if (result.status !== "published" && result.status !== "replayed") {
      return publicationResponse(result);
    }

    return Response.json(
      { success: true, publication: { ...publicationBody(result), pricing } },
      { status: result.status === "replayed" ? 200 : 201 },
    );
  }

  private async parsePriceChange(request: Request): Promise<PriceChangeParse> {
    const body = await readTextRequestBody(request, {
      maxBytes: MAX_PRICE_CHANGE_BODY_BYTES,
    });

    if (body.status === "too_large") {
      return {
        status: "rejected",
        response: errorResponse(
          "payload_too_large",
          `A price change may not exceed ${MAX_PRICE_CHANGE_BODY_BYTES} bytes.`,
          413,
        ),
      };
    }

    let decoded: unknown;

    try {
      decoded = JSON.parse(body.text);
    } catch {
      return {
        status: "rejected",
        response: errorResponse(
          "invalid_request",
          "The price change body is not valid JSON.",
          400,
        ),
      };
    }

    const parsedBody = productPriceChangeSchema.safeParse(decoded);

    if (!parsedBody.success) {
      return {
        status: "rejected",
        response: errorResponse(
          "invalid_request",
          "The body does not match the price change schema.",
          400,
        ),
      };
    }

    return { status: "parsed", body: parsedBody.data };
  }

  private async parsePayload<Metadata extends MetadataShape>(
    request: Request,
    schema: { safeParse(value: unknown): SafeParseResult<Metadata> },
  ): Promise<PayloadParse<Metadata>> {
    const body = await readFormDataRequestBody(request, {
      maxBytes: MAX_PUBLICATION_BYTES,
    });

    if (body.status === "too_large") {
      return {
        status: "rejected",
        response: errorResponse(
          "payload_too_large",
          `A publication payload may not exceed ${MAX_PUBLICATION_BYTES} bytes.`,
          413,
        ),
      };
    }

    if (body.status === "invalid") {
      return {
        status: "rejected",
        response: errorResponse(
          "invalid_request",
          "Expected a multipart publication payload.",
          400,
        ),
      };
    }

    const rawMetadata = body.formData.get("metadata");

    if (typeof rawMetadata !== "string") {
      return {
        status: "rejected",
        response: errorResponse(
          "invalid_request",
          "Expected a metadata field carrying strict JSON.",
          400,
        ),
      };
    }

    let decodedMetadata: unknown;

    try {
      decodedMetadata = JSON.parse(rawMetadata);
    } catch {
      return {
        status: "rejected",
        response: errorResponse(
          "invalid_request",
          "The metadata field is not valid JSON.",
          400,
        ),
      };
    }

    const parsedMetadata = schema.safeParse(decodedMetadata);

    if (!parsedMetadata.success) {
      return {
        status: "rejected",
        response: errorResponse(
          "invalid_request",
          "The metadata field does not match the publication schema.",
          400,
        ),
      };
    }

    const metadata = parsedMetadata.data;
    const coverEntry = body.formData.get("cover");

    if (!isUploadedFile(coverEntry)) {
      return {
        status: "rejected",
        response: errorResponse(
          "invalid_request",
          "Expected a cover file.",
          400,
        ),
      };
    }

    const downloads: ProductDownloadInput[] = [];

    for (const descriptor of metadata.downloads) {
      const entry = body.formData.get(descriptor.field);

      if (!isUploadedFile(entry)) {
        return {
          status: "rejected",
          response: errorResponse(
            "invalid_request",
            `Expected a file in the ${descriptor.field} field.`,
            400,
          ),
        };
      }

      downloads.push({
        bytes: new Uint8Array(await entry.arrayBuffer()),
        customerFilename: descriptor.customerFilename,
      });
    }

    return {
      status: "parsed",
      payload: {
        cover: {
          alt: metadata.coverAlt,
          bytes: new Uint8Array(await coverEntry.arrayBuffer()),
        },
        downloads,
        metadata,
      },
    };
  }
}

type MetadataShape = {
  cardSummary: string;
  coverAlt: string;
  creatorName: string;
  detailDescription: string;
  downloads: readonly { customerFilename: string; field: string }[];
  goalSlugs: readonly string[];
  includedItems: readonly string[];
  title: string;
  typeSlugs: readonly string[];
};

type SafeParseResult<Metadata> =
  { success: true; data: Metadata } | { success: false };

function toDomainMetadata(metadata: MetadataShape): ProductVersionMetadata {
  return {
    cardSummary: metadata.cardSummary,
    creatorName: metadata.creatorName,
    detailDescription: metadata.detailDescription,
    goalSlugs: metadata.goalSlugs,
    includedItems: metadata.includedItems,
    title: metadata.title,
    typeSlugs: metadata.typeSlugs,
  };
}

type SettledPublication = Extract<
  PublishProductResult,
  { status: "published" | "replayed" }
>;

function publicationBody(result: SettledPublication) {
  return {
    id: result.publication.id,
    operation: result.publication.operation,
    productId: result.publication.productId,
    productSlug: result.publication.productSlug,
    productVersionId: result.publication.productVersionId,
    publishedAt: result.publication.publishedAt.toISOString(),
    replayed: result.status === "replayed",
  };
}

function publicationResponse(result: PublishProductResult): Response {
  if (result.status === "unavailable") {
    return errorResponse(
      "server_error",
      "Store management is temporarily unavailable.",
      503,
    );
  }

  if (result.status === "idempotency_conflict") {
    return errorResponse(
      "idempotency_conflict",
      "This idempotency key was already used with a different payload.",
      409,
    );
  }

  if (result.status === "invalid") {
    return validationFailureResponse(result.issues);
  }

  return Response.json(
    { success: true, publication: publicationBody(result) },
    { status: result.status === "replayed" ? 200 : 201 },
  );
}

function validationFailureResponse(
  issues: readonly PublicationIssue[],
): Response {
  if (issues.some((issue) => issue.code === "product_not_found")) {
    return errorResponse("not_found", "Unknown product.", 404);
  }

  return Response.json(
    {
      success: false,
      error: {
        code: "validation_failed",
        message: "The publication payload was rejected.",
        issues,
      },
    },
    { status: 400 },
  );
}

function errorResponse(
  code: string,
  message: string,
  status: number,
): Response {
  return Response.json(
    { success: false, error: { code, message } },
    { status },
  );
}

function parseProductId(parameter: string | undefined): number | null {
  if (!parameter || !/^[1-9][0-9]*$/.test(parameter)) {
    return null;
  }

  const productId = Number(parameter);

  return Number.isSafeInteger(productId) ? productId : null;
}

function isUploadedFile(entry: FormDataEntryValue | null): entry is File {
  return entry !== null && typeof entry !== "string";
}
