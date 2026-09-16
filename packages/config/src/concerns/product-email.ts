import { z } from "zod";

import { isProductionRuntime, type AppConfig } from "./app";

const PLACEHOLDER_SECRET = "replace-me";
const PRODUCT_EMAIL_DEFAULT_ADDRESS = "contact@evoa.fit";

export const productEmailShape = {
  PRODUCT_EMAIL_PROVIDER: z.enum(["memory", "resend"]).default("memory"),
  RESEND_API_KEY: z.string().min(1).optional(),
  PRODUCT_EMAIL_FROM_NAME: z.string().min(1).default("Evoa"),
  PRODUCT_EMAIL_FROM_ADDRESS: z.email().default(PRODUCT_EMAIL_DEFAULT_ADDRESS),
  PRODUCT_EMAIL_REPLY_TO: z.email().default(PRODUCT_EMAIL_DEFAULT_ADDRESS),
};

export type ProductEmailConfig = z.infer<z.ZodObject<typeof productEmailShape>>;

export function refineProductEmail(
  environment: ProductEmailConfig & AppConfig,
  context: z.RefinementCtx,
): void {
  if (environment.PRODUCT_EMAIL_PROVIDER === "resend") {
    if (!environment.RESEND_API_KEY) {
      context.addIssue({
        code: "custom",
        message: "Resend product email delivery requires RESEND_API_KEY.",
        path: ["RESEND_API_KEY"],
      });
    } else if (environment.RESEND_API_KEY === PLACEHOLDER_SECRET) {
      context.addIssue({
        code: "custom",
        message: "Resend product email delivery requires a non-placeholder RESEND_API_KEY.",
        path: ["RESEND_API_KEY"],
      });
    }
  }

  if (environment.PRODUCT_EMAIL_PROVIDER === "memory" && isProductionRuntime(environment)) {
    context.addIssue({
      code: "custom",
      message: "PRODUCT_EMAIL_PROVIDER must be resend in a production runtime.",
      path: ["PRODUCT_EMAIL_PROVIDER"],
    });
  }
}
