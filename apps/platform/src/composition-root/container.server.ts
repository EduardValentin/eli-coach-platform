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

import { CLIENT_PORTAL_PATH } from "~/bounded-contexts/access/public/paths";
import {
  composeAccess,
  type AccessComposition,
} from "~/bounded-contexts/access/composition.server";
import {
  composeClients,
  type ClientsComposition,
} from "~/bounded-contexts/clients/composition.server";
import {
  composeLegal,
  type LegalComposition,
} from "~/bounded-contexts/legal/composition.server";
import {
  composeOperations,
  type OperationsComposition,
} from "~/bounded-contexts/operations/composition.server";
import {
  composePrograms,
  type ProgramsComposition,
} from "~/bounded-contexts/programs/composition.server";
import {
  composeSales,
  type SalesComposition,
} from "~/bounded-contexts/sales/composition.server";
import {
  composeScheduling,
  type SchedulingComposition,
} from "~/bounded-contexts/scheduling/composition.server";
import { createPlatformDatabase } from "~/composition-root/database.server";
import { resolveEmailSubaddressPolicy } from "~/composition-root/email-subaddress-policy.server";
import { createConsoleLogger } from "~/shared/logging/console-logger.server";
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
  access: AccessComposition;
  clients: ClientsComposition;
  closeDatabase: () => Promise<void>;
  legal: LegalComposition;
  operations: OperationsComposition;
  platform: PlatformFeature;
  programs: ProgramsComposition;
  sales: SalesComposition;
  scheduling: SchedulingComposition;
};

let platformContainer: PlatformContainer | null = null;

export function createPlatformContainer(options: {
  runtimeEnvironment: RuntimeEnvironment;
}): PlatformContainer {
  const environment = options.runtimeEnvironment;
  const database = createPlatformDatabase({ runtimeEnvironment: environment });
  const clock = systemClock();
  const logger = createConsoleLogger();
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
  const operations = composeOperations({
    appBasePath: environment.APP_BASE_PATH,
    database: database.client,
    featureFlagsConfig: environment,
  });
  const legal = composeLegal({ documentHasher: createSha256Hasher() });
  const access = composeAccess({
    bootstrapCoachAuthSubjectId: environment.BOOTSTRAP_COACH_AUTH_SUBJECT_ID,
    clerkWebhookSigningSecret: environment.CLERK_WEBHOOK_SIGNING_SECRET,
    clock,
    database: database.client,
    identityConfig: environment,
    portal: {
      appBasePath: environment.APP_BASE_PATH,
      publicAppUrl: environment.PUBLIC_APP_URL,
      signInUrl: environment.CLERK_SIGN_IN_URL,
    },
  });
  const scheduling = composeScheduling({
    appBasePath: environment.APP_BASE_PATH,
    assessmentCallsConfig: environment,
    botDetection,
    botVerifier,
    clock,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    emailAcceptance,
    featureFlags: operations.facades.featureFlags,
    logger,
    productEmail,
    publicAppUrl: environment.PUBLIC_APP_URL,
  });
  const clients = composeClients({
    accountInvitations: access.facades.accountInvitations,
    appBasePath: environment.APP_BASE_PATH,
    clientAvatarRenditions: createClientAvatarRenditions(),
    clientAvatarStore: createClientAvatarStore(environment),
    clientCalls: scheduling.facades.clientCalls,
    clock,
    coachEmail: environment.ASSESSMENT_CALL_COACH_EMAIL,
    coachTime: scheduling.facades.coachTime,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    documentPages: createResourceDocumentPages({
      workerUrl: pdfPagesWorkerUrl(),
      renditions: RESOURCE_RENDITIONS,
    }),
    fileFormats: createResourceFileFormatDetector(),
    identityInvitations: createIdentityInvitations(environment, {
      signUpUrl: environment.CLERK_SIGN_UP_URL,
      returnUrl: clientPortalUrl(environment),
    }),
    imagePages: createResourceImagePages(RESOURCE_RENDITIONS),
    linkTokens,
    logger,
    meetingRoom: scheduling.facades.meetingRoom,
    openSlots: scheduling.facades.openSlots,
    productEmail,
    progressPhotoRenditions: createProgressPhotoRenditions(),
    progressPhotoStore: createProgressPhotoStore(environment),
    publicAppUrl: environment.PUBLIC_APP_URL,
    store: createClientResourceStore(environment.CLIENT_RESOURCE_ROOT),
  });
  const programs = composePrograms({
    clock,
    database: database.client,
    logger,
    photoRenditions: createRecipePhotoRenditions(RECIPE_PHOTO_RENDITION),
    photoStore: createRecipePhotoStore(environment.RECIPE_PHOTO_ROOT),
    videoFormats: createExerciseVideoFormatDetector(),
    videoStore: createExerciseVideoStore(environment.EXERCISE_VIDEO_ROOT),
  });
  const sales = composeSales({
    admissions: clients.facades.admissions,
    appBasePath: environment.APP_BASE_PATH,
    botVerifier,
    clientLookup: clients.facades.clientLookup,
    clientProfile: clients.facades.clientProfile,
    clock,
    coachEmail: environment.ASSESSMENT_CALL_COACH_EMAIL,
    coachingPeriods: clients.facades.coachingPeriods,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    emailAcceptance,
    endedCalls: scheduling.facades.endedCalls,
    featureFlags: operations.facades.featureFlags,
    linkTokens,
    logger,
    managementAuth: {
      authenticator: managementAuthenticator,
      config: managementAuthConfig,
    },
    paymentCheckout: payments.checkout,
    paymentCustomerCards: payments.customerCards,
    paymentEvents: payments.events,
    paymentSubscriptions: payments.subscriptions,
    privacyEmail: EVOA_FITNESS_PRIVACY_EMAIL,
    productEmail,
    publicAppUrl: environment.PUBLIC_APP_URL,
    storeAssetRoot: environment.STORE_ASSET_ROOT,
    terms: legal.facades.terms,
    waitlist: environment,
    webhookSigningSecret: environment.STRIPE_WEBHOOK_SIGNING_SECRET,
  });
  const platform = composePlatformFeature({
    app: environment,
    botDetection,
    version: process.env.GIT_SHA ?? "dev",
  });

  return {
    access,
    clients,
    closeDatabase: () => database.close(),
    legal,
    operations,
    platform,
    programs,
    sales,
    scheduling,
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
