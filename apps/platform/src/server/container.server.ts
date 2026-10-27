import {
  buildRedirectPath,
  resolveFeatureFlagOverridesMode,
  type RuntimeEnvironment,
} from "@eli-coach-platform/config";
import { RESOURCE_RENDITIONS } from "@eli-coach-platform/domain/client-resources";
import { GetFeatureFlagsUseCase } from "@eli-coach-platform/domain/feature-flag";
import { RECIPE_PHOTO_RENDITION } from "@eli-coach-platform/domain/nutrition";
import type { Clock } from "@eli-coach-platform/domain/shared";
import { PostgresFeatureFlagRepository } from "@eli-coach-platform/infrastructure/feature-flags/server";
import {
  createBotDetectionConfig,
  createBotVerifier,
} from "@eli-coach-platform/infrastructure/bot-detection/server";
import {
  createClientAvatarStore,
  createClientResourceStore,
  createExerciseVideoStore,
  createProgressPhotoStore,
  createRecipePhotoStore,
} from "@eli-coach-platform/infrastructure/private-files/server";
import {
  createExerciseVideoFormatDetector,
  createResourceDocumentPages,
  createResourceFileFormatDetector,
} from "@eli-coach-platform/infrastructure/documents/server";
import { createProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import { createIdentityInvitations } from "@eli-coach-platform/infrastructure/identity/server";
import { createLinkTokens } from "@eli-coach-platform/infrastructure/link-tokens/server";
import {
  createClientAvatarRenditions,
  createProgressPhotoRenditions,
  createRecipePhotoRenditions,
  createResourceImagePages,
} from "@eli-coach-platform/infrastructure/images/server";
import { createPayments } from "@eli-coach-platform/infrastructure/payments/server";
import {
  createManagementAuthConfig,
  createManagementAuthenticator,
} from "@eli-coach-platform/infrastructure/management-auth/server";

import { CLIENT_PORTAL_PATH } from "~/bounded-contexts/access/accounts/public/paths";
import {
  composeLegal,
  type LegalComposition,
} from "~/bounded-contexts/legal/composition.server";
import {
  composeAccountsFeature,
  type AccountsFeature,
} from "~/bounded-contexts/access/accounts/server/accounts-composition.server";
import { composeAssessmentCallsFeature } from "~/bounded-contexts/scheduling/assessment-calls/server/assessment-calls-composition.server";
import {
  composeCheckInsFeature,
  type CheckInsFeature,
} from "~/bounded-contexts/clients/check-ins/server/check-ins-composition.server";
import {
  composeClientOnboardingFeature,
  type ClientOnboardingFeature,
} from "~/bounded-contexts/clients/client-profile/server/client-onboarding-composition.server";
import { composeClientProfileFeature } from "~/bounded-contexts/clients/client-profile/server/client-profile-composition.server";
import {
  composeClientResourcesFeature,
  type ClientResourcesFeature,
} from "~/bounded-contexts/clients/client-resources/server/client-resources-composition.server";
import { composeClientsFeature } from "~/bounded-contexts/clients/clients/server/clients-composition.server";
import { composeCoachScheduleFeature } from "~/bounded-contexts/scheduling/coach-schedule/server/coach-schedule-composition.server";
import { composeCoachingSalesFeature } from "~/bounded-contexts/sales/coaching-sales/server/coaching-sales-composition.server";
import {
  composeExerciseLibraryFeature,
  type ExerciseLibraryFeature,
} from "~/bounded-contexts/programs/exercise-library/server/exercise-library-composition.server";
import {
  composeNotificationInbox,
  composeNotificationsFeature,
  type NotificationsFeature,
} from "~/bounded-contexts/clients/notifications/server/notifications-composition.server";
import {
  composeNutritionLibraryFeature,
  type NutritionLibraryFeature,
} from "~/bounded-contexts/programs/nutrition-library/server/nutrition-library-composition.server";
import {
  composeStoreFeature,
  type StoreFeature,
} from "~/bounded-contexts/sales/store/server/store-composition.server";
import { composeWaitlistFeature } from "~/bounded-contexts/sales/waitlist/server/waitlist-composition.server";
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
import { EVOA_FITNESS_PRIVACY_EMAIL } from "~/shared/brand";
import { createSha256Hasher } from "~/shared/documents/sha256-hasher.server";

export type PlatformContainer = {
  accounts: AccountsFeature;
  assessmentCalls: ReturnType<typeof composeAssessmentCallsFeature>;
  checkIns: CheckInsFeature;
  clientOnboarding: ClientOnboardingFeature;
  clientProfile: ReturnType<typeof composeClientProfileFeature>;
  clientResources: ClientResourcesFeature;
  clients: ReturnType<typeof composeClientsFeature>;
  closeDatabase: () => Promise<void>;
  coachSchedule: ReturnType<typeof composeCoachScheduleFeature>;
  coachingSales: ReturnType<typeof composeCoachingSalesFeature>;
  exerciseLibrary: ExerciseLibraryFeature;
  featureFlagOverrides: FeatureFlagOverrides;
  legal: LegalComposition["facades"];
  notifications: NotificationsFeature;
  nutritionLibrary: NutritionLibraryFeature;
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
  const linkTokens = createLinkTokens();
  const legal = composeLegal({ documentHasher: createSha256Hasher() });
  const exerciseLibrary = composeExerciseLibraryFeature({
    clock,
    database: database.client,
    incidents,
    videoFormats: createExerciseVideoFormatDetector(),
    videoStore: createExerciseVideoStore(environment.EXERCISE_VIDEO_ROOT),
  });
  const nutritionLibrary = composeNutritionLibraryFeature({
    clock,
    database: database.client,
    incidents,
    photoRenditions: createRecipePhotoRenditions(RECIPE_PHOTO_RENDITION),
    photoStore: createRecipePhotoStore(environment.RECIPE_PHOTO_ROOT),
  });
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
  const coachSchedule = composeCoachScheduleFeature({
    clock,
    database: database.client,
  });
  const assessmentCalls = composeAssessmentCallsFeature({
    appBasePath: environment.APP_BASE_PATH,
    assessmentCallsConfig: environment,
    availability: coachSchedule.handles.availability,
    botDetection,
    botVerifier,
    calendar: coachSchedule.handles.calendar,
    clock,
    coachTime: coachSchedule.handles.coachTime,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    emailSubaddresses,
    featureFlags,
    incidents,
    meetingRoom: coachSchedule.handles.meetingRoom,
    productEmail,
    publicAppUrl: environment.PUBLIC_APP_URL,
  });
  const clients = composeClientsFeature({
    appBasePath: environment.APP_BASE_PATH,
    assessmentCallReader: assessmentCalls.handles.assessmentCallReader,
    clock,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    identityInvitations: createIdentityInvitations(environment, {
      signUpUrl: environment.CLERK_SIGN_UP_URL,
      returnUrl: clientPortalUrl(environment),
    }),
    incidents,
    linkTokens,
    productEmail,
    publicAppUrl: environment.PUBLIC_APP_URL,
  });
  const notificationInbox = composeNotificationInbox({
    database: database.client,
  });
  const checkIns = composeCheckInsFeature({
    appBasePath: environment.APP_BASE_PATH,
    availability: coachSchedule.handles.availability,
    calendar: coachSchedule.handles.calendar,
    clientIdentities: clients.handles.clientIdentities,
    clientReach: clients.handles.clientReach,
    clock,
    coachEmail: environment.ASSESSMENT_CALL_COACH_EMAIL,
    coachTime: coachSchedule.handles.coachTime,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    inbox: notificationInbox.handles.inbox,
    incidents,
    meetingRoom: coachSchedule.handles.meetingRoom,
    productEmail,
    publicAppUrl: environment.PUBLIC_APP_URL,
  });
  const notifications = composeNotificationsFeature({
    clientReach: clients.handles.clientReach,
    clock,
    expirySources: [checkIns.handles.expirySource],
    inbox: notificationInbox.handles.inbox,
    incidents,
  });
  const clientProfile = composeClientProfileFeature({
    clientAvatarRenditions: createClientAvatarRenditions(),
    clientAvatarStore: createClientAvatarStore(environment),
    clientIdentities: clients.handles.clientIdentities,
    clientReach: clients.handles.clientReach,
    clock,
    database: database.client,
    incidents,
    progressPhotoRenditions: createProgressPhotoRenditions(),
    progressPhotoStore: createProgressPhotoStore(environment),
  });
  const clientOnboarding = composeClientOnboardingFeature({
    appBasePath: environment.APP_BASE_PATH,
    attachProgressPhotos: clientProfile.handles.attachProgressPhotos,
    clientIdentities: clients.handles.clientIdentities,
    clientSettings: clientProfile.handles.clientSettings,
    clock,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    incidents,
    measurementIds: clientProfile.handles.measurementIds,
    measurements: clientProfile.handles.measurements,
    onboardingClients: clients.handles.onboardingClients,
    onboardingReviewStamps: clients.handles.onboardingReviewStamps,
    onboardingSubmissionStamps: clients.handles.clientJourneys,
    productEmail,
    publicAppUrl: environment.PUBLIC_APP_URL,
    recordMeasurementEntry: clientProfile.handles.recordMeasurementEntry,
    recordPhotoConsent: clientProfile.handles.recordPhotoConsent,
    reviewStampWriter: clients.handles.reviewStampWriter,
    seedCoaching: clientProfile.handles.seedCoaching,
  });
  const clientResources = composeClientResourcesFeature({
    clientReach: clients.handles.clientReach,
    clock,
    database: database.client,
    documentPages: createResourceDocumentPages({
      workerUrl: pdfPagesWorkerUrl(),
      renditions: RESOURCE_RENDITIONS,
    }),
    fileFormats: createResourceFileFormatDetector(),
    imagePages: createResourceImagePages(RESOURCE_RENDITIONS),
    incidents,
    store: createClientResourceStore(environment.CLIENT_RESOURCE_ROOT),
  });
  const coachingSales = composeCoachingSalesFeature({
    appBasePath: environment.APP_BASE_PATH,
    assessmentCallReader: assessmentCalls.handles.assessmentCallReader,
    clientIdentities: clients.handles.clientIdentities,
    clientIds: clients.handles.clientIds,
    clientJourneys: clients.handles.clientJourneys,
    clientReach: clients.handles.clientReach,
    clock,
    coachEmail: environment.ASSESSMENT_CALL_COACH_EMAIL,
    coachingEnds: [checkIns.handles.coachingEndHandler],
    coachingPeriods: [checkIns.handles.coachingPeriodHandler],
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    featureFlags,
    incidents,
    linkTokens,
    openClientProfile: clientProfile.handles.openClientProfile,
    paidClientAdmission: clients.handles.paidClientAdmission,
    paymentCheckout: payments.checkout,
    paymentCustomerCards: payments.customerCards,
    paymentSubscriptions: payments.subscriptions,
    pricingEligibility: waitlist.handles.pricingEligibility,
    productEmail,
    publicAppUrl: environment.PUBLIC_APP_URL,
    writeClient: clients.handles.writeClient,
    writeCoachingStanding: clients.handles.writeCoachingStanding,
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
      invitationAcceptance: clients.handles.invitationAcceptance,
      portal: {
        appBasePath: environment.APP_BASE_PATH,
        publicAppUrl: environment.PUBLIC_APP_URL,
        signInUrl: environment.CLERK_SIGN_IN_URL,
      },
    }),
    assessmentCalls,
    checkIns: checkIns.feature,
    clientOnboarding,
    clientProfile,
    clientResources,
    clients,
    closeDatabase: () => database.close(),
    coachSchedule,
    coachingSales,
    exerciseLibrary,
    featureFlagOverrides,
    legal: legal.facades,
    notifications,
    nutritionLibrary,
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
