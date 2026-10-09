import {
  buildRedirectPath,
  resolveFeatureFlagOverridesMode,
  type RuntimeEnvironment,
} from "@eli-coach-platform/config";
import { RESOURCE_RENDITIONS } from "@eli-coach-platform/domain/client-resources";
import { GetFeatureFlagsUseCase } from "@eli-coach-platform/domain/feature-flag";
import type { Clock } from "@eli-coach-platform/domain/shared";
import { EVOA_FITNESS_PRIVACY_EMAIL } from "@eli-coach-platform/content";
import { PostgresFeatureFlagRepository } from "@eli-coach-platform/infrastructure/feature-flags/server";
import {
  createBotDetectionConfig,
  createBotVerifier,
} from "@eli-coach-platform/infrastructure/bot-detection/server";
import {
  createClientResourceStore,
  createProgressPhotoStore,
} from "@eli-coach-platform/infrastructure/client-files/server";
import {
  createResourceDocumentPages,
  createResourceFileFormatDetector,
} from "@eli-coach-platform/infrastructure/documents/server";
import { createProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import { createIdentityInvitations } from "@eli-coach-platform/infrastructure/identity/server";
import {
  createProgressPhotoRenditions,
  createResourceImagePages,
} from "@eli-coach-platform/infrastructure/images/server";
import { createPayments } from "@eli-coach-platform/infrastructure/payments/server";
import {
  createManagementAuthConfig,
  createManagementAuthenticator,
} from "@eli-coach-platform/infrastructure/management-auth/server";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/public/paths";
import {
  composeAccountsFeature,
  type AccountsFeature,
} from "~/features/accounts/server/accounts-composition.server";
import { composeAssessmentCallsFeature } from "~/features/assessment-calls/server/assessment-calls-composition.server";
import {
  composeCheckInsFeature,
  type CheckInsFeature,
} from "~/features/check-ins/server/check-ins-composition.server";
import {
  composeClientOnboardingFeature,
  type ClientOnboardingFeature,
} from "~/features/client-onboarding/server/client-onboarding-composition.server";
import { composeClientProfileFeature } from "~/features/client-profile/server/client-profile-composition.server";
import {
  composeClientResourcesFeature,
  type ClientResourcesFeature,
} from "~/features/client-resources/server/client-resources-composition.server";
import { composeCoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import {
  composeStoreFeature,
  type StoreFeature,
} from "~/features/store/server/store-composition.server";
import { composeWaitlistFeature } from "~/features/waitlist/server/waitlist-composition.server";
import { createPlatformDatabase } from "~/server/database.server";
import {
  composeBrowserFeatureFlagOverrides,
  composeWithoutFeatureFlagOverrides,
  type FeatureFlagOverrides,
} from "~/server/feature-flag-overrides/feature-flag-overrides-composition.server";
import { resolveEmailSubaddressPolicy } from "~/server/email-subaddress-policy.server";
import { createConsoleLogger } from "~/server/logger.server";
import {
  composePlatformFeature,
  type PlatformFeature,
} from "~/server/platform-composition.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

export type PlatformContainer = {
  accounts: AccountsFeature;
  assessmentCalls: ReturnType<typeof composeAssessmentCallsFeature>;
  checkIns: CheckInsFeature;
  clientOnboarding: ClientOnboardingFeature;
  clientProfile: ReturnType<typeof composeClientProfileFeature>;
  clientResources: ClientResourcesFeature;
  closeDatabase: () => Promise<void>;
  coachingSales: ReturnType<typeof composeCoachingSalesFeature>;
  featureFlagOverrides: FeatureFlagOverrides;
  platform: PlatformFeature;
  store: StoreFeature;
  waitlist: ReturnType<typeof composeWaitlistFeature>;
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
  const payments = createPayments(environment);
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
  const emailSubaddresses = resolveEmailSubaddressPolicy(environment);
  const waitlist = composeWaitlistFeature({
    botVerifier,
    clock,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    emailSubaddresses,
    featureFlags,
    incidents,
    privacyEmail: EVOA_FITNESS_PRIVACY_EMAIL,
    productEmail,
    waitlist: environment,
  });
  const assessmentCalls = composeAssessmentCallsFeature({
    appBasePath: environment.APP_BASE_PATH,
    assessmentCallsConfig: environment,
    botDetection,
    botVerifier,
    clock,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    emailSubaddresses,
    featureFlags,
    incidents,
    productEmail,
    publicAppUrl: environment.PUBLIC_APP_URL,
  });
  const coachingSales = composeCoachingSalesFeature({
    appBasePath: environment.APP_BASE_PATH,
    assessmentCallReader: assessmentCalls.handles.assessmentCallReader,
    clock,
    coachEmail: environment.ASSESSMENT_CALL_COACH_EMAIL,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    featureFlags,
    identityInvitations: createIdentityInvitations(environment, {
      signUpUrl: environment.CLERK_SIGN_UP_URL,
      returnUrl: clientPortalUrl(environment),
    }),
    incidents,
    paymentCheckout: payments.checkout,
    paymentCustomerCards: payments.customerCards,
    paymentSubscriptions: payments.subscriptions,
    pricingEligibility: waitlist.handles.pricingEligibility,
    productEmail,
    publicAppUrl: environment.PUBLIC_APP_URL,
  });
  const clientProfile = composeClientProfileFeature({
    clientIdentities: coachingSales.handles.clientIdentities,
    clock,
    database: database.client,
    incidents,
    measurementClients: coachingSales.handles.measurementClients,
    progressPhotoRenditions: createProgressPhotoRenditions(),
    progressPhotoStore: createProgressPhotoStore(environment),
    unitPreferenceClients: coachingSales.handles.unitPreferenceClients,
  });
  const clientOnboarding = composeClientOnboardingFeature({
    appBasePath: environment.APP_BASE_PATH,
    attachProgressPhotos: clientProfile.handles.attachProgressPhotos,
    clock,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    incidents,
    measurements: clientProfile.handles.measurements,
    onboardingClients: coachingSales.handles.onboardingClients,
    onboardingReviewStamps: coachingSales.handles.onboardingReviewStamps,
    onboardingSubmissionStamps:
      coachingSales.handles.onboardingSubmissionStamps,
    productEmail,
    publicAppUrl: environment.PUBLIC_APP_URL,
    recordMeasurementEntry: clientProfile.handles.recordMeasurementEntry,
    reviewStampWriter: coachingSales.handles.reviewStampWriter,
    saveClientProfile: clientProfile.handles.saveClientProfile,
    unitPreferences: clientProfile.handles.unitPreferences,
  });
  const clientResources = composeClientResourcesFeature({
    clock,
    database: database.client,
    documentPages: createResourceDocumentPages({
      workerUrl: pdfPagesWorkerUrl(),
      renditions: RESOURCE_RENDITIONS,
    }),
    fileFormats: createResourceFileFormatDetector(),
    imagePages: createResourceImagePages(RESOURCE_RENDITIONS),
    incidents,
    resourceClients: coachingSales.handles.resourceClients,
    store: createClientResourceStore(environment.CLIENT_RESOURCE_ROOT),
  });
  const checkIns = composeCheckInsFeature({
    appBasePath: environment.APP_BASE_PATH,
    checkInClients: coachingSales.handles.checkInClients,
    clock,
    coachEmail: environment.ASSESSMENT_CALL_COACH_EMAIL,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    incidents,
    productEmail,
    publicAppUrl: environment.PUBLIC_APP_URL,
  });
  const platform = composePlatformFeature({
    app: environment,
    botDetection,
    featureFlags,
    incidents,
    paymentCardHandler: coachingSales.handles.paymentCardHandler,
    paymentCompletionHandlers: [coachingSales.handles.paymentCompletionHandler],
    paymentEvents: payments.events,
    paymentRefundHandler: coachingSales.handles.refundHandler,
    paymentSubscriptionChangeHandlers: [
      coachingSales.handles.subscriptionChangeHandler,
    ],
    version: process.env.GIT_SHA ?? "dev",
    webhookSigningSecret: environment.STRIPE_WEBHOOK_SIGNING_SECRET,
  });

  return {
    accounts: composeAccountsFeature({
      bootstrapCoachAuthSubjectId: environment.BOOTSTRAP_COACH_AUTH_SUBJECT_ID,
      clerkWebhookSigningSecret: environment.CLERK_WEBHOOK_SIGNING_SECRET,
      database: database.client,
      invitationAcceptance: coachingSales.handles.invitationAcceptance,
      portal: {
        appBasePath: environment.APP_BASE_PATH,
        publicAppUrl: environment.PUBLIC_APP_URL,
        signInUrl: environment.CLERK_SIGN_IN_URL,
      },
    }),
    assessmentCalls,
    checkIns,
    clientOnboarding,
    clientProfile,
    clientResources,
    closeDatabase: () => database.close(),
    coachingSales,
    featureFlagOverrides,
    platform,
    store: composeStoreFeature({
      appBasePath: environment.APP_BASE_PATH,
      botVerifier,
      clock,
      contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
      database: database.client,
      emailSubaddresses,
      incidents,
      managementAuth: {
        authenticator: managementAuthenticator,
        config: managementAuthConfig,
      },
      productEmail,
      publicAppUrl: environment.PUBLIC_APP_URL,
      storeAssetRoot: environment.STORE_ASSET_ROOT,
    }),
    waitlist,
  };
}

export function getPlatformContainer(): PlatformContainer {
  platformContainer ??= createPlatformContainer({
    runtimeEnvironment: getRuntimeEnvironment(),
  });

  return platformContainer;
}

function pdfPagesWorkerUrl(): URL {
  return import.meta.env.DEV
    ? new URL(
        import.meta
          .resolve("@eli-coach-platform/infrastructure/documents/pdf-pages-worker"),
      )
    : new URL("./pdf-pages-worker.js", import.meta.url);
}

function clientPortalUrl(environment: RuntimeEnvironment): string {
  return new URL(
    buildRedirectPath(environment.APP_BASE_PATH, CLIENT_PORTAL_PATH),
    environment.PUBLIC_APP_URL,
  ).toString();
}
