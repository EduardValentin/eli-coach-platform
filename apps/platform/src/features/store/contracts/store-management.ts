import { z } from "zod";

const productSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9-]*$/);

/**
 * Rejected here rather than only at the database so a path separator, a
 * traversal segment, or a device-style prefix never reaches storage-key
 * construction. Storage keys are derived from content digests regardless, so
 * this guards the customer-facing download name alone.
 */
const customerFilenameSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine((value) => !value.includes("/") && !value.includes("\\"), {
    message: "A customer filename may not contain a path separator.",
  })
  .refine((value) => value !== "." && value !== "..", {
    message: "A customer filename may not be a directory reference.",
  });

const downloadDescriptorSchema = z.object({
  field: z.string().trim().min(1).max(128),
  customerFilename: customerFilenameSchema,
});

const versionMetadataSchema = z.object({
  title: z.string().trim().min(1).max(240),
  creatorName: z.string().trim().min(1).max(160),
  cardSummary: z.string().trim().min(1).max(500),
  detailDescription: z.string().trim().min(1).max(10_000),
  includedItems: z.array(z.string().trim().min(1).max(500)).min(1).max(100),
  coverAlt: z.string().trim().min(1).max(500),
  typeSlugs: z.array(productSlugSchema).min(1).max(16),
  goalSlugs: z.array(productSlugSchema).min(1).max(16),
  downloads: z.array(downloadDescriptorSchema).min(1).max(32),
});

/**
 * Exactly one of the two, so an ambiguous request is rejected rather than
 * silently validated as whichever operation the reader happens to check first.
 */
export const productValidationMetadataSchema = versionMetadataSchema
  .extend({
    slug: productSlugSchema.optional(),
    targetProductSlug: productSlugSchema.optional(),
  })
  .refine(
    (metadata) => Boolean(metadata.slug) !== Boolean(metadata.targetProductSlug),
    {
      message:
        "Provide either slug for a new product or targetProductSlug for a revision, not both.",
    },
  );

export const newProductMetadataSchema = versionMetadataSchema.extend({
  slug: productSlugSchema,
  idempotencyKey: z.string().trim().min(1).max(128),
});

export const productVersionMetadataSchema = versionMetadataSchema.extend({
  idempotencyKey: z.string().trim().min(1).max(128),
});

const plannedAssetSchema = z.object({
  assetKey: z.string().min(1),
  customerFilename: customerFilenameSchema,
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});

const plannedCoverSchema = z.object({
  assetKey: z.string().min(1),
  alt: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});

const taxonomyValueSchema = z.object({
  slug: productSlugSchema,
  label: z.string().min(1),
  displayOrder: z.number().int().nonnegative(),
});

export const publicationPlanSchema = z.object({
  operation: z.enum(["create_product", "revise_product"]),
  productId: z.number().int().positive().nullable(),
  productSlug: productSlugSchema,
  displayOrder: z.number().int().nonnegative(),
  versionSequence: z.number().int().positive(),
  cover: plannedCoverSchema,
  downloads: z.array(plannedAssetSchema),
  types: z.array(taxonomyValueSchema),
  goals: z.array(taxonomyValueSchema),
  totalUploadBytes: z.number().int().nonnegative(),
});

export const publicationPlanResponseSchema = z.object({
  success: z.literal(true),
  plan: publicationPlanSchema,
});

export const publishedProductResponseSchema = z.object({
  success: z.literal(true),
  publication: z.object({
    id: z.number().int().positive(),
    operation: z.enum(["create_product", "revise_product"]),
    productId: z.number().int().positive(),
    productSlug: productSlugSchema,
    productVersionId: z.number().int().positive(),
    publishedAt: z.string().min(1),
    replayed: z.boolean(),
  }),
});

export const retiredProductResponseSchema = z.object({
  success: z.literal(true),
  product: z.object({
    id: z.number().int().positive(),
    lifecycleStatus: z.literal("archived"),
  }),
});

export const managementErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    issues: z.array(z.record(z.string(), z.unknown())).optional(),
  }),
});

export type ProductValidationMetadata = z.infer<
  typeof productValidationMetadataSchema
>;
export type NewProductMetadata = z.infer<typeof newProductMetadataSchema>;
export type ProductVersionMetadataInput = z.infer<
  typeof productVersionMetadataSchema
>;
export type PublicationPlanResponse = z.infer<
  typeof publicationPlanResponseSchema
>;
export type PublishedProductResponse = z.infer<
  typeof publishedProductResponseSchema
>;
export type ManagementErrorResponse = z.infer<
  typeof managementErrorResponseSchema
>;
