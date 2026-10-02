import type { AppConfig, DatabaseConfig } from "@eli-coach-platform/config";
import type { FeatureFlagReader } from "@eli-coach-platform/domain/feature-flag";
import type { BotDetectionConfig } from "@eli-coach-platform/infrastructure/bot-detection";
import type {
  PaymentCompletionHandler,
  PaymentEvents,
  PaymentRefundHandler,
  PaymentSubscriptionChangeHandler,
  PaymentWebhookIncidents,
} from "@eli-coach-platform/infrastructure/payments/server";

import { AppMetadataController } from "~/server/api/meta/app-metadata-controller.server";
import { FeatureFlagController } from "~/server/api/feature-flags/feature-flags-controller.server";
import { ReadyzController } from "~/server/api/readyz/readyz-controller.server";
import { StripeWebhookController } from "~/server/api/stripe-webhooks/stripe-webhook-controller.server";

export type PlatformFeature = {
  appBasePath: string;
  botDetection: BotDetectionConfig;
  featureFlags: FeatureFlagController;
  metadata: AppMetadataController;
  readyz: ReadyzController;
  stripeWebhooks: StripeWebhookController;
};

export type PlatformControllers = Pick<
  PlatformFeature,
  "featureFlags" | "metadata" | "readyz" | "stripeWebhooks"
>;

export type RuntimeConfig = Pick<
  PlatformFeature,
  "appBasePath" | "botDetection"
>;

type PlatformFeatureHandles = {
  app: AppConfig & DatabaseConfig;
  botDetection: BotDetectionConfig;
  featureFlags: FeatureFlagReader;
  incidents: PaymentWebhookIncidents;
  paymentCompletionHandlers: readonly PaymentCompletionHandler[];
  paymentEvents: PaymentEvents;
  paymentRefundHandler: PaymentRefundHandler;
  paymentSubscriptionChangeHandlers: readonly PaymentSubscriptionChangeHandler[];
  version: string;
  webhookSigningSecret: string | undefined;
};

export function composePlatformFeature(
  handles: PlatformFeatureHandles,
): PlatformFeature {
  return {
    appBasePath: handles.app.APP_BASE_PATH,
    botDetection: handles.botDetection,
    featureFlags: new FeatureFlagController(handles.featureFlags),
    metadata: new AppMetadataController({
      appName: handles.app.APP_NAME,
      environment: handles.app.ENVIRONMENT,
      version: handles.version,
    }),
    readyz: new ReadyzController(handles.app),
    stripeWebhooks: new StripeWebhookController({
      completionHandlersByPurpose: handlersByPurpose(
        handles.paymentCompletionHandlers,
        "payment completion",
      ),
      incidents: handles.incidents,
      paymentEvents: handles.paymentEvents,
      refundHandler: handles.paymentRefundHandler,
      signingSecret: handles.webhookSigningSecret,
      subscriptionChangeHandlersByPurpose: handlersByPurpose(
        handles.paymentSubscriptionChangeHandlers,
        "subscription change",
      ),
    }),
  };
}

function handlersByPurpose<Handler extends { readonly purpose: string }>(
  handlers: readonly Handler[],
  handlerKind: string,
): ReadonlyMap<string, Handler> {
  const byPurpose = new Map<string, Handler>();

  for (const handler of handlers) {
    if (byPurpose.has(handler.purpose)) {
      throw new Error(
        `Two ${handlerKind} handlers serve the purpose "${handler.purpose}".`,
      );
    }

    byPurpose.set(handler.purpose, handler);
  }

  return byPurpose;
}
