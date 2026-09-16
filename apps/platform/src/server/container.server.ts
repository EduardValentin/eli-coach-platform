import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import type { StoreClock } from "@eli-coach-platform/domain/store";
import {
  createBotDetectionConfig,
  createBotVerifier,
} from "@eli-coach-platform/infrastructure/bot-detection/server";
import {
  BearerSecretManagementAuthenticator,
  createManagementAuthConfig,
} from "@eli-coach-platform/infrastructure/management-auth/server";

import {
  composeAccountsFeature,
  type AccountsFeature,
} from "~/features/accounts/server/accounts-composition.server";
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
  composePlatformFeature,
  type PlatformFeature,
} from "~/server/platform-composition.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

export type PlatformContainer = {
  accounts: AccountsFeature;
  closeDatabase: () => Promise<void>;
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
  const clock: StoreClock = { now: () => new Date() };
  const botVerifier = createBotVerifier(environment);
  const managementAuthConfig = createManagementAuthConfig(environment);

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
    closeDatabase: () => database.close(),
    platform: composePlatformFeature({
      appBasePath: environment.APP_BASE_PATH,
      botDetection: createBotDetectionConfig(environment),
      database: database.client,
      runtimeEnvironment: environment,
      version: process.env.GIT_SHA ?? "dev",
    }),
    store: composeStoreFeature({
      appBasePath: environment.APP_BASE_PATH,
      botVerifier,
      clock,
      database: database.client,
      managementAuth: {
        authenticator: new BearerSecretManagementAuthenticator({
          principalId: managementAuthConfig.principalId,
          secret: managementAuthConfig.secret,
        }),
        config: managementAuthConfig,
      },
      runtimeEnvironment: environment,
      storeAssetRoot: environment.STORE_ASSET_ROOT,
    }),
    waitlist: composeWaitlistFeature({
      botVerifier,
      database: database.client,
      runtimeEnvironment: environment,
    }),
  };
}

export function getPlatformContainer(): PlatformContainer {
  platformContainer ??= createPlatformContainer({
    runtimeEnvironment: getRuntimeEnvironment(),
  });

  return platformContainer;
}
