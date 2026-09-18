import { z } from "zod";

import { appShape } from "./concerns/app";
import {
  assessmentCallsShape,
  refineAssessmentCalls,
} from "./concerns/assessment-calls";
import {
  botDetectionShape,
  refineBotDetection,
} from "./concerns/bot-detection";
import { clerkShape, refineClerk } from "./concerns/clerk";
import { databaseShape } from "./concerns/database";
import {
  managementApiShape,
  refineManagementApi,
} from "./concerns/management-api";
import {
  productEmailShape,
  refineProductEmail,
} from "./concerns/product-email";
import { storeAssetsShape, refineStoreAssets } from "./concerns/store-assets";
import { waitlistShape } from "./concerns/waitlist";

export const runtimeEnvironmentSchema = z
  .object({
    ...appShape,
    ...databaseShape,
    ...clerkShape,
    ...waitlistShape,
    ...botDetectionShape,
    ...productEmailShape,
    ...storeAssetsShape,
    ...managementApiShape,
    ...assessmentCallsShape,
  })
  .superRefine(refineAssessmentCalls)
  .superRefine(refineBotDetection)
  .superRefine(refineClerk)
  .superRefine(refineManagementApi)
  .superRefine(refineProductEmail)
  .superRefine(refineStoreAssets);

export type RuntimeEnvironment = z.infer<typeof runtimeEnvironmentSchema>;
