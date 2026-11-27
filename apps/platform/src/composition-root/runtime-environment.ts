import { z } from "zod";

import {
  clerkShape,
  refineClerk,
} from "~/bounded-contexts/access/accounts/config.server";
import {
  clientFilesShape,
  refineClientFiles,
} from "~/bounded-contexts/clients/client-profile/config.server";
import {
  exerciseVideosShape,
  refineExerciseVideos,
} from "~/bounded-contexts/programs/exercise-library/config.server";
import {
  recipePhotosShape,
  refineRecipePhotos,
} from "~/bounded-contexts/programs/nutrition-library/config.server";
import {
  paymentsShape,
  refinePayments,
} from "~/bounded-contexts/sales/shared/payments/config.server";
import {
  refineStoreAssets,
  storeAssetsShape,
} from "~/bounded-contexts/sales/store/config.server";
import { waitlistShape } from "~/bounded-contexts/sales/waitlist/config.server";
import { assessmentCallsShape } from "~/bounded-contexts/scheduling/assessment-calls/config.server";
import {
  featureFlagsShape,
  refineFeatureFlagOverrides,
} from "~/bounded-contexts/operations/feature-flags/config.server";
import { comingSoonShape } from "~/composition-root/coming-soon/config.server";
import { databaseShape } from "~/shared/database/connection";
import {
  productEmailShape,
  refineProductEmail,
} from "~/shared/email/product-email-config";
import {
  botDetectionShape,
  refineBotDetection,
} from "~/shared/submission-checks/bot-detection-settings";

// Every page, asset URL and cookie path carries the prefix, so only plain path
// segments are accepted: no scheme, host, quote, separator or empty segment.
const URL_PREFIX_PATTERN =
  /^\/(?:[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*\/?)?$/;

const appShape = {
  APP_NAME: z.string().default("eli-coach-platform"),
  ENVIRONMENT: z.string().default("local"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  APP_BASE_PATH: z
    .string()
    .regex(
      URL_PREFIX_PATTERN,
      "APP_BASE_PATH must be a path prefix such as / or /eli-coach-platform.",
    )
    .default("/"),
  PUBLIC_APP_URL: z.url(),
  API_PUBLIC_URL: z.url().optional(),
};

export type AppConfig = z.infer<z.ZodObject<typeof appShape>>;

const runtimeEnvironmentSchema = z
  .object({
    ...appShape,
    ...databaseShape,
    ...clerkShape,
    ...waitlistShape,
    ...botDetectionShape,
    ...productEmailShape,
    ...paymentsShape,
    ...storeAssetsShape,
    ...clientFilesShape,
    ...exerciseVideosShape,
    ...recipePhotosShape,
    ...assessmentCallsShape,
    ...featureFlagsShape,
    ...comingSoonShape,
  })
  .superRefine(refineBotDetection)
  .superRefine(refineFeatureFlagOverrides)
  .superRefine(refineClerk)
  .superRefine(refineProductEmail)
  .superRefine(refinePayments)
  .superRefine(refineStoreAssets)
  .superRefine(refineClientFiles)
  .superRefine(refineExerciseVideos)
  .superRefine(refineRecipePhotos);

export type RuntimeEnvironment = z.infer<typeof runtimeEnvironmentSchema>;

export function loadRuntimeEnvironment(
  source: NodeJS.ProcessEnv,
): RuntimeEnvironment {
  return runtimeEnvironmentSchema.parse(source);
}

let runtimeEnvironment: RuntimeEnvironment | null = null;

export function getRuntimeEnvironment(): RuntimeEnvironment {
  runtimeEnvironment ??= loadRuntimeEnvironment(process.env);

  return runtimeEnvironment;
}
