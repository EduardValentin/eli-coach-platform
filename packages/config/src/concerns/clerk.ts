import { z } from "zod";

import type { AppConfig } from "./app";

export const clerkShape = {
  CLERK_PUBLISHABLE_KEY: z.string().regex(/^pk_(test|live)_[A-Za-z0-9=]+$/, {
    message: "CLERK_PUBLISHABLE_KEY must be a real Clerk publishable key.",
  }),
  CLERK_SECRET_KEY: z.string().regex(/^sk_(test|live)_[A-Za-z0-9]+$/, {
    message: "CLERK_SECRET_KEY must be a real Clerk secret key.",
  }),
  CLERK_SIGN_IN_URL: z.url(),
  CLERK_WEBHOOK_SIGNING_SECRET: z
    .string()
    .regex(/^whsec_.+$/, {
      message: "CLERK_WEBHOOK_SIGNING_SECRET must be a Clerk signing secret.",
    })
    .optional(),
  BOOTSTRAP_COACH_AUTH_SUBJECT_ID: z
    .string()
    .regex(/^user_[A-Za-z0-9]+$/, {
      message: "BOOTSTRAP_COACH_AUTH_SUBJECT_ID must be a Clerk user id.",
    })
    .optional(),
};

export type ClerkConfig = z.infer<z.ZodObject<typeof clerkShape>>;

export function refineClerk(
  environment: ClerkConfig & AppConfig,
  context: z.RefinementCtx,
): void {
  if (environment.ENVIRONMENT !== "production") {
    return;
  }
  if (environment.CLERK_WEBHOOK_SIGNING_SECRET) {
    return;
  }
  context.addIssue({
    code: "custom",
    message:
      "Production requires CLERK_WEBHOOK_SIGNING_SECRET for Clerk webhook verification.",
    path: ["CLERK_WEBHOOK_SIGNING_SECRET"],
  });
}
