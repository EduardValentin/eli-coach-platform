import { randomUUID } from "node:crypto";

import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as base, expect } from "@playwright/test";
import type { AccountRole } from "@eli-coach-platform/domain/account";
import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import type pg from "pg";

import { AccountPortal } from "./account-portal";
import { BookingPage } from "./booking-page";
import { ClientDashboard } from "./client-dashboard";
import { ClientOnboarding } from "./client-onboarding";
import { ClientPortalShell } from "./client-portal-shell";
import { ClientProfilePage } from "./client-profile-page";
import { CoachAssessmentCallsPage } from "./coach-assessment-calls-page";
import { CoachClientPage } from "./coach-client-page";
import { CoachClientsPage } from "./coach-clients-page";
import {
  insertMeasuredClientRecords,
  type MeasuredClientSeed,
} from "./measured-clients";
import { MeasurementRecords } from "./measurement-records";
import { MeasurementsSheet } from "./measurements-sheet";
import { OnboardingRecords } from "./onboarding-records";
import { PhotoRequests } from "./photo-requests";
import { PhotoLightbox } from "./photo-lightbox";
import { PhotoView } from "./photo-view";
import { PortalRequests } from "./portal-requests";
import {
  insertInvitedClientRecords,
  insertPaidClientRecords,
  type InvitationStanding,
  type InvitedClient,
  type PaidClient,
  type PaidClientIdentity,
  type StartChoice,
  type InvitationSeed,
} from "./paid-clients";
import {
  insertClientInState,
  insertProfiledClientRecords,
  isInvitedState,
  insertReviewedClientRecords,
  type ClientState,
  type SubmissionProfile,
  type ReviewState,
  type SubmittedClient,
} from "./submitted-clients";
import { recordCreatedEmail } from "./clerk-users";
import { createE2eDatabasePool } from "./database";
import { requireEnv } from "./env";
import { PublicNav } from "./public-nav";
import { resolveRunId, runEmailPrefix } from "./run-id";
import { StripeCheckoutPage } from "./stripe-checkout";
import {
  cleanUpRecordedStripeObjects,
  registerCheckoutSessionForCleanup,
} from "./stripe-cleanup";
import {
  insertSubscribedClientRecords,
  type SubscribedClient,
  type SubscribedClientSeed,
} from "./subscribed-clients";

type PlatformFixtures = {
  siteOutOfWaitlistMode: void;
  publicNav: PublicNav;
  clientPortalShell: ClientPortalShell;
  clientOnboarding: ClientOnboarding;
  clientDashboard: ClientDashboard;
  clientProfile: ClientProfilePage;
  measurementsSheet: MeasurementsSheet;
  photoView: PhotoView;
  photoLightbox: PhotoLightbox;
  accountPortal: AccountPortal;
  testEmail: string;
  visitorEmail: string;
  stripeCheckout: StripeCheckoutPage;
  registerCheckoutSessionForCleanup: (sessionId: string) => void;
  bookingPage: BookingPage;
  coachAssessmentCalls: CoachAssessmentCallsPage;
  coachClients: CoachClientsPage;
  coachClient: CoachClientPage;
  coachEmail: string;
  scenarioTag: string;
  createClerkUser: () => Promise<string>;
  // Inserts the accounts row directly because no entry point creates one yet.
  // Once the coach's invitation flow lands, arrange through it instead: sign
  // in as the bootstrap coach, invite testEmail, accept the invitation. That
  // removes databasePool and this INSERT from the suite.
  provisionAccount: (role: AccountRole) => Promise<void>;
  provisionPaidClient: (
    gender: VisitorGender,
    options?: PaidClientOptions,
  ) => Promise<PaidClient>;
  provisionInvitedClient: (
    standing: InvitationStanding,
  ) => Promise<InvitedClient>;
  provisionSubmittedClient: (
    start: StartChoice,
    state?: ReviewState,
  ) => Promise<SubmittedClient>;
  provisionSubscribedClient: (
    seed: SubscribedClientSeed,
  ) => Promise<SubscribedClient>;
  provisionClientInState: (state: ClientState) => Promise<PaidClient>;
  provisionProfiledClient: (
    profile: SubmissionProfile,
  ) => Promise<SubmittedClient>;
  otherClientEmail: string;
  provisionMeasuredClient: (
    seed: MeasuredClientSeed,
  ) => Promise<SubmittedClient>;
  provisionOtherMeasuredClient: (
    seed: MeasuredClientSeed,
  ) => Promise<SubmittedClient>;
  measurementRecords: MeasurementRecords;
  photoRequests: PhotoRequests;
  visitorPhotoRequests: PhotoRequests;
  portalRequests: PortalRequests;
  provisionCoach: () => Promise<void>;
  onboardingRecords: OnboardingRecords;
  signIn: () => Promise<void>;
  signInAsCoach: () => Promise<void>;
  signInAsOtherClient: () => Promise<void>;
};

// Shared per worker process: both are cheap to reuse across a worker's tests.
type WorkerFixtures = {
  clerkBackendClient: ClerkClient;
  databasePool: pg.Pool;
};

// Unique per test, not per email-lookup, so a rerun with the same worker
// process never collides with a previous run's Clerk users or accounts rows
// — the whole point of the +clerk_test convention being namespaced this way.
// Resolved (not generated) here: global-setup.ts already generated this
// run's id and published it via run-id.ts's environment variable before this
// worker process started, so every email this worker mints and every email
// global-teardown.ts later reads back agree on the same run.
const RUN_ID = resolveRunId();
const INSERT_ACCOUNT =
  "INSERT INTO app.accounts (auth_subject_id, role) VALUES ($1, $2)";
const PAID_CLIENT_FIRST_NAME = "Ana";
const PAID_CLIENT_LAST_NAME = `Onboarding ${RUN_ID}`;
const ADULT_DATE_OF_BIRTH = "1994-03-14";
const INVITED_CLIENT_FIRST_NAME = "Bianca";
const INVITED_CLIENT_SURNAME: Record<InvitationStanding, string> = {
  pending: "Pending",
  expired: "Expired",
  "email-failed": "Unsent",
};
const CLIENT_FIRST_NAME_BY_STATE: Record<ClientState, string> = {
  "invited-pending": "Bianca",
  "invited-expired": "Bianca",
  "invited-email-failed": "Bianca",
  onboarding: "Carla",
  "awaiting-review": "Dana",
  "in-review": "Elena",
  "needs-details": "Flavia",
  approved: "Gina",
};
const MEASURED_CLIENT_FIRST_NAME = "Ana";
const OTHER_MEASURED_CLIENT_FIRST_NAME = "Bianca";
const PROFILED_CLIENT_FIRST_NAME: Record<SubmissionProfile, string> = {
  flagged: "Irina",
  "manual-screening": "Mihai",
};

type PaidClientOptions = { dateOfBirth: string };

type MeasuredClientAccount = {
  authSubjectId: string;
  email: string;
  firstName: string;
};
let sequence = 0;

function mintRecordedTestEmail(workerIndex: number): string {
  sequence += 1;
  // Clerk treats any address carrying a `+clerk_test` subaddress as a test
  // email that accepts the fixed OTP code instead of sending a real one —
  // https://clerk.com/docs/guides/development/testing/test-emails-and-phones
  // documents it as `local+clerk_test@domain`. The run/sequence marker sits
  // *before* that subaddress so `+clerk_test` stays the exact tag Clerk
  // documents, rather than risking a second `+` segment its matcher may not
  // recognize.
  // The worker index keeps a restarted worker, whose sequence starts over,
  // from minting an address an earlier worker of the same run already used.
  const email = `${runEmailPrefix(RUN_ID)}${workerIndex}-${sequence}+clerk_test@evoa.fit`;
  // Recorded before any test does anything with it, so a run-scoped cleanup
  // registry exists even for the failure paths that never reach
  // createClerkUser (see clerk-users.ts and global-teardown.ts).
  recordCreatedEmail(email, RUN_ID);

  return email;
}

function requireProviderUrl(invitation: { id: string; url?: string }): string {
  if (!invitation.url) {
    throw new Error(`Clerk invitation ${invitation.id} carries no URL.`);
  }

  return invitation.url;
}

function measuredClientIdentity(
  account: MeasuredClientAccount,
  scenarioTag: string,
): PaidClientIdentity {
  return {
    ...account,
    lastName: `Measurements ${scenarioTag}`,
    gender: "female",
    dateOfBirth: ADULT_DATE_OF_BIRTH,
  };
}

async function createProviderInvitation(
  clerkBackendClient: ClerkClient,
  email: string,
): Promise<Omit<InvitationSeed, "standing">> {
  const id = randomUUID();
  const provider = await clerkBackendClient.invitations.createInvitation({
    emailAddress: email,
    ignoreExisting: true,
    notify: false,
    publicMetadata: { invitationId: id },
  });

  return {
    id,
    provider: { id: provider.id, url: requireProviderUrl(provider) },
  };
}

export const test = base.extend<PlatformFixtures, WorkerFixtures>({
  clerkBackendClient: [
    // Playwright inspects this signature to resolve fixture dependencies;
    // the first param must stay a destructuring pattern even when this
    // fixture needs none of them.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await use(
        createClerkClient({ secretKey: requireEnv("CLERK_SECRET_KEY") }),
      );
    },
    { scope: "worker" },
  ],

  databasePool: [
    // Playwright inspects this signature to resolve fixture dependencies;
    // the first param must stay a destructuring pattern even when this
    // fixture needs none of them.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const pool = createE2eDatabasePool();

      await use(pool);
      await pool.end();
    },
    { scope: "worker" },
  ],

  // Overrides the built-in `page` fixture so every test gets the bot-
  // protection bypass before it ever navigates — this Clerk instance has
  // captcha on, and this token is its documented bypass for automated
  // browsers. Every other fixture below that depends on `page` receives
  // this same instance, so nothing has to remember to call it per spec.
  page: async ({ page }, use) => {
    await setupClerkTestingToken({ page });
    await use(page);
  },

  // Applies the URL override before the journey's own first page.goto, so the
  // server's session cookie already carries it for every navigation after.
  siteOutOfWaitlistMode: [
    async ({ page }, use) => {
      await page.goto("/?ff.WAITLIST_MODE=false");
      await use();
    },
    { auto: true },
  ],

  publicNav: async ({ page }, use) => {
    await use(new PublicNav(page));
  },

  clientPortalShell: async ({ page }, use) => {
    await use(new ClientPortalShell(page));
  },

  clientOnboarding: async ({ page }, use) => {
    await use(new ClientOnboarding(page));
  },

  clientDashboard: async ({ page }, use) => {
    await use(new ClientDashboard(page));
  },

  clientProfile: async ({ page }, use) => {
    await use(new ClientProfilePage(page));
  },

  measurementsSheet: async ({ page }, use) => {
    await use(new MeasurementsSheet(page));
  },

  photoView: async ({ page }, use) => {
    await use(new PhotoView(page));
  },

  photoLightbox: async ({ page }, use) => {
    await use(new PhotoLightbox(page));
  },

  accountPortal: async ({ page }, use) => {
    await use(new AccountPortal(page));
  },

  // Playwright inspects this signature to resolve fixture dependencies;
  // the first param must stay a destructuring pattern even when this
  // fixture needs none of them.
  // eslint-disable-next-line no-empty-pattern
  testEmail: async ({}, use, testInfo) => {
    await use(mintRecordedTestEmail(testInfo.workerIndex));
  },

  // eslint-disable-next-line no-empty-pattern
  visitorEmail: async ({}, use, testInfo) => {
    await use(mintRecordedTestEmail(testInfo.workerIndex));
  },

  stripeCheckout: async ({ page }, use) => {
    await use(new StripeCheckoutPage(page));
  },

  // eslint-disable-next-line no-empty-pattern
  registerCheckoutSessionForCleanup: async ({}, use) => {
    await use((sessionId) =>
      registerCheckoutSessionForCleanup(sessionId, RUN_ID),
    );
    await cleanUpRecordedStripeObjects(RUN_ID, "[e2e cleanup]");
  },

  bookingPage: async ({ page }, use) => {
    await use(new BookingPage(page));
  },

  coachAssessmentCalls: async ({ page }, use) => {
    await use(new CoachAssessmentCallsPage(page));
  },

  coachClients: async ({ page }, use) => {
    await use(new CoachClientsPage(page));
  },

  coachClient: async ({ page }, use) => {
    await use(new CoachClientPage(page));
  },

  // eslint-disable-next-line no-empty-pattern
  coachEmail: async ({}, use, testInfo) => {
    await use(mintRecordedTestEmail(testInfo.workerIndex));
  },

  // eslint-disable-next-line no-empty-pattern
  scenarioTag: async ({}, use) => {
    await use(randomUUID().slice(0, 8));
  },

  createClerkUser: async ({ clerkBackendClient, testEmail }, use) => {
    await use(async () => {
      const user = await clerkBackendClient.users.createUser({
        emailAddress: [testEmail],
      });

      return user.id;
    });
  },

  provisionAccount: async ({ createClerkUser, databasePool }, use) => {
    await use(async (role: AccountRole) => {
      const authSubjectId = await createClerkUser();

      await databasePool.query(INSERT_ACCOUNT, [authSubjectId, role]);
    });
  },

  provisionPaidClient: async (
    { createClerkUser, databasePool, testEmail },
    use,
  ) => {
    await use(
      async (
        gender: VisitorGender,
        options: PaidClientOptions = { dateOfBirth: ADULT_DATE_OF_BIRTH },
      ) => {
        const authSubjectId = await createClerkUser();

        await databasePool.query(INSERT_ACCOUNT, [authSubjectId, "CLIENT"]);

        return insertPaidClientRecords(databasePool, {
          authSubjectId,
          email: testEmail,
          firstName: PAID_CLIENT_FIRST_NAME,
          lastName: PAID_CLIENT_LAST_NAME,
          gender,
          dateOfBirth: options.dateOfBirth,
        });
      },
    );
  },

  provisionSubmittedClient: async (
    { createClerkUser, databasePool, scenarioTag, testEmail },
    use,
  ) => {
    await use(
      async (start: StartChoice, state: ReviewState = "awaiting-review") => {
        const authSubjectId = await createClerkUser();

        await databasePool.query(INSERT_ACCOUNT, [authSubjectId, "CLIENT"]);

        return insertReviewedClientRecords(
          databasePool,
          {
            identity: {
              authSubjectId,
              email: testEmail,
              firstName: PAID_CLIENT_FIRST_NAME,
              lastName: `Onboarding ${scenarioTag}`,
              gender: "female",
              dateOfBirth: ADULT_DATE_OF_BIRTH,
            },
            start,
          },
          state,
        );
      },
    );
  },

  provisionSubscribedClient: async (
    { createClerkUser, databasePool, scenarioTag, testEmail },
    use,
  ) => {
    await use(async (seed: SubscribedClientSeed) => {
      const authSubjectId = await createClerkUser();

      await databasePool.query(INSERT_ACCOUNT, [authSubjectId, "CLIENT"]);

      return insertSubscribedClientRecords(
        databasePool,
        {
          authSubjectId,
          email: testEmail,
          firstName: PAID_CLIENT_FIRST_NAME,
          lastName: `Subscription ${scenarioTag}`,
          gender: "female",
          dateOfBirth: ADULT_DATE_OF_BIRTH,
        },
        { ...seed, runId: RUN_ID },
      );
    });
    await cleanUpRecordedStripeObjects(RUN_ID, "[e2e cleanup]");
  },

  provisionClientInState: async (
    { clerkBackendClient, databasePool, scenarioTag },
    use,
    testInfo,
  ) => {
    await use(async (state: ClientState) => {
      const email = mintRecordedTestEmail(testInfo.workerIndex);
      const invitation = isInvitedState(state)
        ? await createProviderInvitation(clerkBackendClient, email)
        : undefined;

      return insertClientInState(
        databasePool,
        {
          identity: {
            authSubjectId: `user_e2e_${randomUUID()}`,
            email,
            firstName: CLIENT_FIRST_NAME_BY_STATE[state],
            lastName: `Roster ${scenarioTag}`,
            gender: "female",
            dateOfBirth: ADULT_DATE_OF_BIRTH,
          },
          start: "waiting",
          invitation,
        },
        state,
      );
    });
  },

  provisionProfiledClient: async (
    { databasePool, scenarioTag },
    use,
    testInfo,
  ) => {
    await use(async (profile: SubmissionProfile) =>
      insertProfiledClientRecords(
        databasePool,
        {
          authSubjectId: `user_e2e_${randomUUID()}`,
          email: mintRecordedTestEmail(testInfo.workerIndex),
          firstName: PROFILED_CLIENT_FIRST_NAME[profile],
          lastName: `Profile ${scenarioTag}`,
        },
        profile,
      ),
    );
  },

  portalRequests: async ({ page }, use) => {
    await use(new PortalRequests(page));
  },

  // eslint-disable-next-line no-empty-pattern
  otherClientEmail: async ({}, use, testInfo) => {
    await use(mintRecordedTestEmail(testInfo.workerIndex));
  },

  provisionMeasuredClient: async (
    { createClerkUser, databasePool, scenarioTag, testEmail },
    use,
  ) => {
    await use(async (seed: MeasuredClientSeed) => {
      const authSubjectId = await createClerkUser();

      await databasePool.query(INSERT_ACCOUNT, [authSubjectId, "CLIENT"]);

      return insertMeasuredClientRecords(
        databasePool,
        measuredClientIdentity(
          {
            authSubjectId,
            email: testEmail,
            firstName: MEASURED_CLIENT_FIRST_NAME,
          },
          scenarioTag,
        ),
        seed,
      );
    });
  },

  provisionOtherMeasuredClient: async (
    { clerkBackendClient, databasePool, otherClientEmail, scenarioTag },
    use,
  ) => {
    await use(async (seed: MeasuredClientSeed) => {
      const user = await clerkBackendClient.users.createUser({
        emailAddress: [otherClientEmail],
      });

      await databasePool.query(INSERT_ACCOUNT, [user.id, "CLIENT"]);

      return insertMeasuredClientRecords(
        databasePool,
        measuredClientIdentity(
          {
            authSubjectId: user.id,
            email: otherClientEmail,
            firstName: OTHER_MEASURED_CLIENT_FIRST_NAME,
          },
          scenarioTag,
        ),
        seed,
      );
    });
  },

  measurementRecords: async ({ databasePool }, use) => {
    await use(new MeasurementRecords(databasePool));
  },

  photoRequests: async ({ page }, use) => {
    await use(new PhotoRequests(page.request));
  },

  visitorPhotoRequests: async ({ baseURL, playwright }, use) => {
    const visitor = await playwright.request.newContext({ baseURL });

    await use(new PhotoRequests(visitor));
    await visitor.dispose();
  },

  provisionInvitedClient: async (
    { clerkBackendClient, databasePool, scenarioTag },
    use,
    testInfo,
  ) => {
    await use(async (standing: InvitationStanding) => {
      const email = mintRecordedTestEmail(testInfo.workerIndex);
      const invitation = await createProviderInvitation(
        clerkBackendClient,
        email,
      );

      return insertInvitedClientRecords(
        databasePool,
        {
          email,
          firstName: INVITED_CLIENT_FIRST_NAME,
          lastName: `${INVITED_CLIENT_SURNAME[standing]} ${scenarioTag}`,
          gender: "female",
          dateOfBirth: ADULT_DATE_OF_BIRTH,
        },
        { invitation: { ...invitation, standing } },
      );
    });
  },

  provisionCoach: async (
    { clerkBackendClient, coachEmail, databasePool },
    use,
  ) => {
    await use(async () => {
      const coach = await clerkBackendClient.users.createUser({
        emailAddress: [coachEmail],
      });

      await databasePool.query(INSERT_ACCOUNT, [coach.id, "COACH"]);
    });
  },

  onboardingRecords: async ({ databasePool, testEmail }, use) => {
    await use(new OnboardingRecords(databasePool, testEmail));
  },

  signIn: async ({ publicNav, accountPortal, testEmail }, use) => {
    await use(async () => {
      await publicNav.openSignIn();
      await accountPortal.signInWithEmail(testEmail);
      await accountPortal.completeEmailOtp();
    });
  },

  signInAsCoach: async ({ publicNav, accountPortal, coachEmail }, use) => {
    await use(async () => {
      await publicNav.openSignIn();
      await accountPortal.signInWithEmail(coachEmail);
      await accountPortal.completeEmailOtp();
    });
  },

  signInAsOtherClient: async (
    { publicNav, accountPortal, otherClientEmail },
    use,
  ) => {
    await use(async () => {
      await publicNav.openSignIn();
      await accountPortal.signInWithEmail(otherClientEmail);
      await accountPortal.completeEmailOtp();
    });
  },
});

export { expect };
