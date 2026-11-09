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

const downloadDescriptorSchema = z.strictObject({
  field: z.string().trim().min(1).max(128),
  customerFilename: customerFilenameSchema,
});

const idempotencyKeySchema = z.string().trim().min(1).max(128);

const productPricingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("free") }),
  z.strictObject({
    kind: z.literal("paid"),
    eurCents: z.number().optional(),
    usdCents: z.number().optional(),
  }),
]);

export type ProductPricingRequest = z.infer<typeof productPricingSchema>;

const versionMetadataSchema = z.strictObject({
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

export const productValidationMetadataSchema = z.union([
  versionMetadataSchema.extend({
    slug: productSlugSchema,
    idempotencyKey: idempotencyKeySchema.optional(),
    pricing: productPricingSchema,
  }),
  versionMetadataSchema.extend({
    targetProductSlug: productSlugSchema,
    idempotencyKey: idempotencyKeySchema.optional(),
  }),
]);

export const newProductMetadataSchema = versionMetadataSchema.extend({
  slug: productSlugSchema,
  idempotencyKey: idempotencyKeySchema,
  pricing: productPricingSchema,
});

export const productVersionMetadataSchema = versionMetadataSchema.extend({
  idempotencyKey: idempotencyKeySchema,
});

export const productPriceChangeSchema = z.strictObject({
  idempotencyKey: idempotencyKeySchema,
  pricing: productPricingSchema,
});
