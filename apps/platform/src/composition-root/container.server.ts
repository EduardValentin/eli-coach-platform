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
import { ConsoleLoggerAdapter } from "~/shared/logging/console-logger-adapter.server";
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
  const consoleLoggerAdapter = new ConsoleLoggerAdapter();
  const botDetection = createBotDetectionConfig(environment);
  const botVerifierPort = createBotVerifier(environment);
  const productEmailPort = createProductEmail(environment);
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
  const legal = composeLegal({ documentHasherPort: createSha256Hasher() });
  const access = composeAccess({
    bootstrapCoachAuthSubjectId: environment.BOOTSTRAP_COACH_AUTH_SUBJECT_ID,
    clerkWebhookSigningSecret: environment.CLERK_WEBHOOK_SIGNING_SECRET,
    clockPort: clock,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    identityConfig: environment,
    linkTokens,
    loggerPort: consoleLoggerAdapter,
    portal: {
      appBasePath: environment.APP_BASE_PATH,
      publicAppUrl: environment.PUBLIC_APP_URL,
      signInUrl: environment.CLERK_SIGN_IN_URL,
    },
    productEmailPort,
  });
  const scheduling = composeScheduling({
    appBasePath: environment.APP_BASE_PATH,
    assessmentCallsConfig: environment,
    botDetection,
    botVerifierPort,
    clockPort: clock,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    emailAcceptancePort: emailAcceptance,
    featureFlagsFacade: operations.facades.featureFlagsFacade,
    loggerPort: consoleLoggerAdapter,
    productEmailPort,
    publicAppUrl: environment.PUBLIC_APP_URL,
  });
  const clients = composeClients({
    accountInvitationsFacade: access.facades.accountInvitationsFacade,
    appBasePath: environment.APP_BASE_PATH,
    clientCallsFacade: scheduling.facades.clientCallsFacade,
    clientFilesConfig: environment,
    clockPort: clock,
    coachEmail: environment.ASSESSMENT_CALL_COACH_EMAIL,
    coachTimeFacade: scheduling.facades.coachTimeFacade,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    documentPagesWorkerUrl: pdfPagesWorkerUrl(),
    loggerPort: consoleLoggerAdapter,
    meetingRoomFacade: scheduling.facades.meetingRoomFacade,
    openSlotsFacade: scheduling.facades.openSlotsFacade,
    productEmailPort,
    publicAppUrl: environment.PUBLIC_APP_URL,
  });
  const programs = composePrograms({
    clockPort: clock,
    database: database.client,
    exerciseVideosConfig: environment,
    loggerPort: consoleLoggerAdapter,
    recipePhotosConfig: environment,
  });
  const sales = composeSales({
    admissionsFacade: clients.facades.admissionsFacade,
    appBasePath: environment.APP_BASE_PATH,
    botVerifierPort,
    clientLookupFacade: clients.facades.clientLookupFacade,
    clientProfileFacade: clients.facades.clientProfileFacade,
    clockPort: clock,
    coachEmail: environment.ASSESSMENT_CALL_COACH_EMAIL,
    coachingPeriodsFacade: clients.facades.coachingPeriodsFacade,
    contactEmail: environment.PRODUCT_EMAIL_REPLY_TO,
    database: database.client,
    emailAcceptancePort: emailAcceptance,
    endedCallsFacade: scheduling.facades.endedCallsFacade,
    featureFlagsFacade: operations.facades.featureFlagsFacade,
    linkTokens,
    loggerPort: consoleLoggerAdapter,
    managementApiConfig: environment,
    paymentsConfig: environment,
    privacyEmail: EVOA_FITNESS_PRIVACY_EMAIL,
    productEmailPort,
    publicAppUrl: environment.PUBLIC_APP_URL,
    storeAssetRoot: environment.STORE_ASSET_ROOT,
    termsFacade: legal.facades.terms,
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
