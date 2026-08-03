import { z } from "zod";

const productSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9-]*$/);

const taxonomyValueSchema = z.object({
  slug: productSlugSchema,
  label: z.string().trim().min(1).max(96),
  displayOrder: z.number().int().nonnegative(),
});

export const storeProductSchema = z.object({
  slug: productSlugSchema,
  title: z.string().trim().min(1).max(240),
  creatorName: z.string().trim().min(1).max(160),
  cardSummary: z.string().trim().min(1).max(500),
  detailDescription: z.string().trim().min(1).max(10_000),
  includedItems: z.array(z.string().trim().min(1).max(500)).max(100),
  cover: z.object({
    url: z.string().trim().min(1),
    alt: z.string().trim().min(1).max(500),
  }),
  types: z.array(taxonomyValueSchema),
  goals: z.array(taxonomyValueSchema),
});

const storeCatalogSuccessSchema = z.object({
  success: z.literal(true),
  products: z.array(storeProductSchema),
});

const storeCatalogErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal("server_error"),
    message: z.string().min(1),
  }),
});

export const storeCatalogResponseSchema = z.discriminatedUnion("success", [
  storeCatalogSuccessSchema,
  storeCatalogErrorSchema,
]);

function parseBooleanFormValue(value: unknown): unknown {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
}

function parseProductSlugs(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

const uniqueProductSlugsSchema = z
  .array(productSlugSchema)
  .min(1)
  .max(50)
  .refine((slugs) => new Set(slugs).size === slugs.length, {
    message: "Product identifiers must be unique.",
  });

export const storeAcquisitionRequestSchema = z.object({
  email: z.string().trim().max(320).pipe(z.email()),
  productSlugs: z.preprocess(parseProductSlugs, uniqueProductSlugsSchema),
  termsAccepted: z.preprocess(parseBooleanFormValue, z.literal(true)),
  marketingConsent: z.preprocess(parseBooleanFormValue, z.boolean()),
  idempotencyKey: z.uuid(),
});

const storeAcquisitionSuccessSchema = z.object({
  success: z.literal(true),
});

export const storeAcquisitionErrorCodeSchema = z.enum([
  "invalid_request",
  "bot_verification_failed",
  "unavailable_products",
  "idempotency_conflict",
  "delivery_unavailable",
  "delivery_retryable",
  "server_error",
]);

const storeAcquisitionErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: storeAcquisitionErrorCodeSchema,
    message: z.string().min(1),
    availableProductSlugs: z.array(productSlugSchema).optional(),
  }),
});

export const storeAcquisitionResponseSchema = z.discriminatedUnion("success", [
  storeAcquisitionSuccessSchema,
  storeAcquisitionErrorSchema,
]);

export const storeDownloadRequestSchema = z.object({
  token: z.string().trim().min(1).max(512),
});

export type StoreProduct = z.infer<typeof storeProductSchema>;
export type StoreCatalogResponse = z.infer<
  typeof storeCatalogResponseSchema
>;
export type StoreAcquisitionRequest = z.infer<
  typeof storeAcquisitionRequestSchema
>;
export type StoreAcquisitionResponse = z.infer<
  typeof storeAcquisitionResponseSchema
>;
export type StoreAcquisitionErrorCode = z.infer<
  typeof storeAcquisitionErrorCodeSchema
>;
export type StoreDownloadRequest = z.infer<
  typeof storeDownloadRequestSchema
>;
