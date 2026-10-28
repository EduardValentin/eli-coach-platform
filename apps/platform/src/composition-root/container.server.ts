import { systemClock } from "~/shared/clock/system-clock";
import { createEmailAcceptance } from "~/shared/submission-checks/email-address";
import {
  createBotDetectionConfig,
  createBotVerifier,
} from "~/shared/submission-checks/bot-detection/index.server";
import { createProductEmail } from "~/shared/email/index.server";
import {
  createTokenGenerator,
  createTokenHasher,
} from "~/shared/tokens/link-tokens.server";

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
  const productEmail = createProductEmail(environment);
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
    clientCalls: scheduling.facades.clientCalls,
    clientFilesConfig: environment,
    clock,
    coachEmail: environment.ASSESSMENT_CALL_COACH_EMAIL,
    coachTime: scheduling.facades.coachTime,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    documentPagesWorkerUrl: pdfPagesWorkerUrl(),
    identityConfig: environment,
    linkTokens,
    logger,
    meetingRoom: scheduling.facades.meetingRoom,
    openSlots: scheduling.facades.openSlots,
    productEmail,
    publicAppUrl: environment.PUBLIC_APP_URL,
  });
  const programs = composePrograms({
    clock,
    database: database.client,
    exerciseVideosConfig: environment,
    logger,
    recipePhotosConfig: environment,
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
    managementApiConfig: environment,
    paymentsConfig: environment,
    privacyEmail: EVOA_FITNESS_PRIVACY_EMAIL,
    productEmail,
    publicAppUrl: environment.PUBLIC_APP_URL,
    storeAssetRoot: environment.STORE_ASSET_ROOT,
    terms: legal.facades.terms,
    waitlist: environment,
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
