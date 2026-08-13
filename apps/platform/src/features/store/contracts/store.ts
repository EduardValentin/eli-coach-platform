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

const storeAcquisitionEmailSchema = z
  .string()
  .trim()
  .max(320)
  .pipe(z.email({ error: "Enter a valid email address." }));

export const storeAcquisitionFormSchema = z.object({
  email: storeAcquisitionEmailSchema,
  marketingConsent: z.boolean(),
  termsAccepted: z.boolean().refine((accepted) => accepted, {
    message: "Accept the Terms & Conditions to continue.",
  }),
});

export const storeAcquisitionRequestSchema = z
  .object({
    email: z.unknown(),
    marketingConsent: z.preprocess(parseBooleanFormValue, z.unknown()),
    termsAccepted: z.preprocess(parseBooleanFormValue, z.unknown()),
  })
  .pipe(storeAcquisitionFormSchema)
  .and(
    z.object({
      idempotencyKey: z.uuid(),
      productSlugs: z.preprocess(
        parseProductSlugs,
        uniqueProductSlugsSchema,
      ),
    }),
  );

const storeAcquisitionSuccessSchema = z.object({
  success: z.literal(true),
});

const storeAcquisitionErrorCodeSchema = z.enum([
  "invalid_request",
  "bot_verification_failed",
  "unavailable_products",
  "idempotency_conflict",
  "delivery_unavailable",
  "delivery_retryable",
  "rate_limited_cooldown",
  "rate_limited_daily",
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
export type StoreAcquisitionForm = z.infer<
  typeof storeAcquisitionFormSchema
>;
export type StoreCatalogResponse = z.infer<
  typeof storeCatalogResponseSchema
>;
export type StoreAcquisitionResponse = z.infer<
  typeof storeAcquisitionResponseSchema
>;
export type StoreAcquisitionErrorCode = z.infer<
  typeof storeAcquisitionErrorCodeSchema
>;
