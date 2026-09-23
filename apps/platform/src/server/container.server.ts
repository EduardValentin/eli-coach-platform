import {
  resolveFeatureFlagOverridesMode,
  type RuntimeEnvironment,
} from "@eli-coach-platform/config";
import { GetFeatureFlagsUseCase } from "@eli-coach-platform/domain/feature-flag";
import type { Clock } from "@eli-coach-platform/domain/shared";
import { EVOA_FITNESS_PRIVACY_EMAIL } from "@eli-coach-platform/content";
import { PostgresFeatureFlagRepository } from "@eli-coach-platform/infrastructure/feature-flags/server";
import {
  createBotDetectionConfig,
  createBotVerifier,
} from "@eli-coach-platform/infrastructure/bot-detection/server";
import { createProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import {
  createManagementAuthConfig,
  createManagementAuthenticator,
} from "@eli-coach-platform/infrastructure/management-auth/server";

import {
  composeAccountsFeature,
  type AccountsFeature,
} from "~/features/accounts/server/accounts-composition.server";
import {
  composeAssessmentCallsFeature,
  type AssessmentCallsFeature,
} from "~/features/assessment-calls/server/assessment-calls-composition.server";
import {
  composeStoreFeature,
  type StoreFeature,
} from "~/features/store/server/store-composition.server";
import {
  composeWaitlistFeature,
  type WaitlistFeature,
} from "~/features/waitlist/server/waitlist-composition.server";
import { createPlatformDatabase } from "~/server/database.server";
import {
  composeBrowserFeatureFlagOverrides,
  composeWithoutFeatureFlagOverrides,
  type FeatureFlagOverrides,
} from "~/server/feature-flag-overrides/feature-flag-overrides-composition.server";
import { createConsoleLogger } from "~/server/logger.server";
import {
  composePlatformFeature,
  type PlatformFeature,
} from "~/server/platform-composition.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

export type PlatformContainer = {
  accounts: AccountsFeature;
  assessmentCalls: AssessmentCallsFeature;
  closeDatabase: () => Promise<void>;
  featureFlagOverrides: FeatureFlagOverrides;
  platform: PlatformFeature;
  store: StoreFeature;
  waitlist: WaitlistFeature;
};

let platformContainer: PlatformContainer | null = null;

export function createPlatformContainer(options: {
  runtimeEnvironment: RuntimeEnvironment;
}): PlatformContainer {
  const environment = options.runtimeEnvironment;
  const database = createPlatformDatabase({ runtimeEnvironment: environment });
  const clock: Clock = { now: () => new Date() };
  const incidents = createConsoleLogger();
  const botDetection = createBotDetectionConfig(environment);
  const botVerifier = createBotVerifier(environment);
  const managementAuthConfig = createManagementAuthConfig(
    { MANAGEMENT_API_SECRET: environment.MANAGEMENT_API_SECRET },
    { PUBLIC_APP_URL: environment.PUBLIC_APP_URL },
  );
  const managementAuthenticator = createManagementAuthenticator(environment);
  const productEmail = createProductEmail(environment);
  const databaseFeatureFlags = new GetFeatureFlagsUseCase({
    featureFlags: new PostgresFeatureFlagRepository(database.client),
  });
  const featureFlagOverrides =
    resolveFeatureFlagOverridesMode(environment) === "browser"
      ? composeBrowserFeatureFlagOverrides({
          appBasePath: environment.APP_BASE_PATH,
          featureFlags: databaseFeatureFlags,
        })
      : composeWithoutFeatureFlagOverrides(databaseFeatureFlags);
  const featureFlags = featureFlagOverrides.featureFlags;
  const platform = composePlatformFeature({
    app: environment,
    botDetection,
    featureFlags,
    version: process.env.GIT_SHA ?? "dev",
  });

  return {
    accounts: composeAccountsFeature({
      bootstrapCoachAuthSubjectId: environment.BOOTSTRAP_COACH_AUTH_SUBJECT_ID,
      clerkWebhookSigningSecret: environment.CLERK_WEBHOOK_SIGNING_SECRET,
      database: database.client,
      portal: {
        appBasePath: environment.APP_BASE_PATH,
        publicAppUrl: environment.PUBLIC_APP_URL,
        signInUrl: environment.CLERK_SIGN_IN_URL,
      },
    }),
    assessmentCalls: composeAssessmentCallsFeature({
      appBasePath: environment.APP_BASE_PATH,
      assessmentCallsConfig: environment,
      botDetection,
      botVerifier,
      clock,
      contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
      database: database.client,
      featureFlags,
      incidents,
      productEmail,
      publicAppUrl: environment.PUBLIC_APP_URL,
    }),
    closeDatabase: () => database.close(),
    featureFlagOverrides,
    platform,
    store: composeStoreFeature({
      appBasePath: environment.APP_BASE_PATH,
      botVerifier,
      clock,
      contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
      database: database.client,
      incidents,
      managementAuth: {
        authenticator: managementAuthenticator,
        config: managementAuthConfig,
      },
      productEmail,
      publicAppUrl: environment.PUBLIC_APP_URL,
      storeAssetRoot: environment.STORE_ASSET_ROOT,
    }),
    waitlist: composeWaitlistFeature({
      botVerifier,
      clock,
      contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
      database: database.client,
      featureFlags,
      incidents,
      privacyEmail: EVOA_FITNESS_PRIVACY_EMAIL,
      productEmail,
      waitlist: environment,
    }),
  };
}

export function getPlatformContainer(): PlatformContainer {
  platformContainer ??= createPlatformContainer({
    runtimeEnvironment: getRuntimeEnvironment(),
  });

  return platformContainer;
}
