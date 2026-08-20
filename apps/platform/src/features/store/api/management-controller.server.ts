import {
  MAX_PUBLICATION_BYTES,
  type ProductCoverInput,
  type ProductDownloadInput,
  type ProductVersionMetadata,
  type PublicationIssue,
  type PublicationPlanResult,
  type PublishingPrincipal,
  type PublishProductResult,
  type StoreProductPublicationService,
} from "@eli-coach-platform/domain";
import {
  isSecureManagementTransport,
  type ManagementAuthConfig,
  type ManagementAuthenticator,
} from "@eli-coach-platform/infrastructure/management-auth/server";

import {
  newProductMetadataSchema,
  productValidationMetadataSchema,
  productVersionMetadataSchema,
} from "~/features/store/contracts/store-management";
import { readFormDataRequestBody } from "~/server/http.server";

type StoreProductManagementControllerOptions = {
  authConfig: ManagementAuthConfig;
  authenticator: ManagementAuthenticator;
  publicationService: StoreProductPublicationService;
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

export class StoreProductManagementController {
  private readonly authConfig: ManagementAuthConfig;
  private readonly authenticator: ManagementAuthenticator;
  private readonly publicationService: StoreProductPublicationService;

  constructor(options: StoreProductManagementControllerOptions) {
    this.authConfig = options.authConfig;
    this.authenticator = options.authenticator;
    this.publicationService = options.publicationService;
  }

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
    let result: PublicationPlanResult;

    if (metadata.targetProductSlug) {
      result = await this.publicationService.planProductRevision({
        cover,
        downloads,
        metadata: domainMetadata,
        productSlug: metadata.targetProductSlug,
      });
    } else if (metadata.slug) {
      result = await this.publicationService.planNewProduct({
        cover,
        downloads,
        metadata: domainMetadata,
        slug: metadata.slug,
      });
    } else {
      /**
       * The metadata schema already forbids naming neither, but that is a
       * runtime refinement rather than a type-level one, so both fields stay
       * optional here. Answering rather than asserting keeps a weakened schema
       * from turning into a thrown exception.
       */
      return errorResponse(
        "invalid_request",
        "Provide either slug for a new product or targetProductSlug for a revision.",
        400,
      );
    }

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
      await this.publicationService.publishNewProduct({
        cover,
        downloads,
        idempotencyKey: metadata.idempotencyKey,
        metadata: toDomainMetadata(metadata),
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
      await this.publicationService.publishProductVersion({
        cover,
        downloads,
        idempotencyKey: metadata.idempotencyKey,
        metadata: toDomainMetadata(metadata),
        productId,
        publishedBy: authorized.principal,
      }),
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

    const result = await this.publicationService.retireProduct(productId);

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
      this.authConfig.transportPolicy === "https_required" &&
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

    const result = await this.authenticator.authenticate(request);

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
  | { success: true; data: Metadata }
  | { success: false };

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
    {
      success: true,
      publication: {
        id: result.publication.id,
        operation: result.publication.operation,
        productId: result.publication.productId,
        productSlug: result.publication.productSlug,
        productVersionId: result.publication.productVersionId,
        publishedAt: result.publication.publishedAt.toISOString(),
        replayed: result.status === "replayed",
      },
    },
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
