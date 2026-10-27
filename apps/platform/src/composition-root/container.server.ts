import { buildRedirectPath } from "~/shared/http/base-path";
import { RESOURCE_RENDITIONS } from "~/bounded-contexts/clients/client-resources/domain/client-resources";
import { RECIPE_PHOTO_RENDITION } from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";
import { systemClock } from "~/shared/clock/system-clock";
import { createEmailAcceptance } from "~/shared/submission-checks/email-address";
import {
  createBotDetectionConfig,
  createBotVerifier,
} from "~/shared/submission-checks/bot-detection/index.server";
import {
  createClientAvatarStore,
  createProgressPhotoStore,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/client-media-stores.server";
import { createClientResourceStore } from "~/bounded-contexts/clients/client-resources/adapters/outbound/persistence/client-resource-store.server";
import { createExerciseVideoStore } from "~/bounded-contexts/programs/exercise-library/adapters/outbound/persistence/exercise-video-store.server";
import { createRecipePhotoStore } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/recipe-photo-store.server";
import { createExerciseVideoFormatDetector } from "~/bounded-contexts/programs/exercise-library/adapters/outbound/persistence/exercise-video-format-detector.server";
import { createResourceDocumentPages } from "~/bounded-contexts/clients/client-resources/adapters/outbound/persistence/resource-document-pages.server";
import { createResourceFileFormatDetector } from "~/bounded-contexts/clients/client-resources/adapters/outbound/persistence/resource-file-format-detector.server";
import { createProductEmail } from "~/shared/email/index.server";
import { createIdentityInvitations } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/identity/create-identity-invitations.server";
import {
  createTokenGenerator,
  createTokenHasher,
} from "~/shared/tokens/link-tokens.server";
import { createClientAvatarRenditions } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/client-avatar-renditions.server";
import { createProgressPhotoRenditions } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/progress-photo-renditions.server";
import { createRecipePhotoRenditions } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/recipe-photo-renditions.server";
import { createResourceImagePages } from "~/bounded-contexts/clients/client-resources/adapters/outbound/persistence/resource-image-pages.server";
import { createPayments } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/create-payments.server";
import { createManagementAuthConfig } from "~/bounded-contexts/sales/store/adapters/inbound/http/management/management-auth/management-auth-config.server";
import { createManagementAuthenticator } from "~/bounded-contexts/sales/store/adapters/inbound/http/management/management-auth/create-management-authenticator.server";

import { CLIENT_PORTAL_PATH } from "~/bounded-contexts/access/accounts/public/paths";
import {
  composeLegal,
  type LegalComposition,
} from "~/bounded-contexts/legal/composition.server";
import { composeFeatureFlagsFeature } from "~/bounded-contexts/operations/feature-flags/composition.server";
import { composeAccountsFeature } from "~/bounded-contexts/access/accounts/composition.server";
import { composeAssessmentCallsFeature } from "~/bounded-contexts/scheduling/assessment-calls/composition.server";
import { composeCheckInsFeature } from "~/bounded-contexts/clients/check-ins/composition.server";
import {
  composeClientOnboardingFeature,
  composeClientProfileFeature,
} from "~/bounded-contexts/clients/client-profile/composition.server";
import { composeClientResourcesFeature } from "~/bounded-contexts/clients/client-resources/composition.server";
import { composeClientsFeature } from "~/bounded-contexts/clients/clients/composition.server";
import { composeCoachScheduleFeature } from "~/bounded-contexts/scheduling/coach-schedule/composition.server";
import { composeCoachingSalesFeature } from "~/bounded-contexts/sales/coaching-sales/composition.server";
import { composeExerciseLibraryFeature } from "~/bounded-contexts/programs/exercise-library/composition.server";
import {
  composeNotificationInbox,
  composeNotificationsFeature,
} from "~/bounded-contexts/clients/notifications/composition.server";
import { composeNutritionLibraryFeature } from "~/bounded-contexts/programs/nutrition-library/composition.server";
import { composeStoreFeature } from "~/bounded-contexts/sales/store/composition.server";
import { composeWaitlistFeature } from "~/bounded-contexts/sales/waitlist/composition.server";
import { createPlatformDatabase } from "~/composition-root/database.server";
import { resolveEmailSubaddressPolicy } from "~/composition-root/email-subaddress-policy.server";
import { createConsoleLogger } from "~/composition-root/logger.server";
import {
  composePlatformFeature,
  type PlatformFeature,
} from "~/composition-root/platform-composition.server";
import {
  getRuntimeEnvironment,
  type RuntimeEnvironment,
} from "~/composition-root/runtime-environment";
import { EVOA_FITNESS_PRIVACY_EMAIL } from "~/shared/brand";
import { createSha256Hasher } from "~/shared/documents/sha256-hasher.server";

export type PlatformContainer = {
  accounts: ReturnType<typeof composeAccountsFeature>;
  assessmentCalls: ReturnType<typeof composeAssessmentCallsFeature>;
  checkIns: ReturnType<typeof composeCheckInsFeature>["feature"];
  clientOnboarding: ReturnType<typeof composeClientOnboardingFeature>;
  clientProfile: ReturnType<typeof composeClientProfileFeature>;
  clientResources: ReturnType<typeof composeClientResourcesFeature>;
  clients: ReturnType<typeof composeClientsFeature>;
  closeDatabase: () => Promise<void>;
  coachSchedule: ReturnType<typeof composeCoachScheduleFeature>;
  coachingSales: ReturnType<typeof composeCoachingSalesFeature>;
  exerciseLibrary: ReturnType<typeof composeExerciseLibraryFeature>;
  featureFlags: ReturnType<typeof composeFeatureFlagsFeature>;
  legal: LegalComposition["facades"];
  notifications: ReturnType<typeof composeNotificationsFeature>;
  nutritionLibrary: ReturnType<typeof composeNutritionLibraryFeature>;
  platform: PlatformFeature;
  store: ReturnType<typeof composeStoreFeature>;
  waitlist: ReturnType<typeof composeWaitlistFeature>;
};

let platformContainer: PlatformContainer | null = null;

export function createPlatformContainer(options: {
  runtimeEnvironment: RuntimeEnvironment;
}): PlatformContainer {
  const environment = options.runtimeEnvironment;
  const database = createPlatformDatabase({ runtimeEnvironment: environment });
  const featureFlags = composeFeatureFlagsFeature({
    appBasePath: environment.APP_BASE_PATH,
    database: database.client,
    featureFlagsConfig: environment,
  });
  const clock = systemClock();
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
  const emailAcceptance = createEmailAcceptance(
    resolveEmailSubaddressPolicy(environment),
  );
  const linkTokens = {
    generator: createTokenGenerator(),
    hasher: createTokenHasher(),
  };
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
    emailAcceptance,
    featureFlags: featureFlags.reader,
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
    emailAcceptance,
    featureFlags: featureFlags.reader,
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
    emailAcceptance,
    featureFlags: featureFlags.reader,
    incidents,
    linkTokens,
    openClientProfile: clientProfile.handles.openClientProfile,
    paidClientAdmission: clients.handles.paidClientAdmission,
    paymentCheckout: payments.checkout,
    paymentCustomerCards: payments.customerCards,
    paymentEvents: payments.events,
    paymentSubscriptions: payments.subscriptions,
    pricingEligibility: waitlist.handles.pricingEligibility,
    productEmail,
    publicAppUrl: environment.PUBLIC_APP_URL,
    webhookSigningSecret: environment.STRIPE_WEBHOOK_SIGNING_SECRET,
    writeClient: clients.handles.writeClient,
    writeCoachingStanding: clients.handles.writeCoachingStanding,
  });
  const platform = composePlatformFeature({
    app: environment,
    botDetection,
    version: process.env.GIT_SHA ?? "dev",
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
    featureFlags,
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
      emailAcceptance,
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
    ? new URL("../shared/documents/pdf-pages-worker.server.ts", import.meta.url)
    : new URL("./pdf-pages-worker.js", import.meta.url);
}

function clientPortalUrl(environment: RuntimeEnvironment): string {
  return new URL(
    buildRedirectPath(environment.APP_BASE_PATH, CLIENT_PORTAL_PATH),
    environment.PUBLIC_APP_URL,
  ).toString();
}
