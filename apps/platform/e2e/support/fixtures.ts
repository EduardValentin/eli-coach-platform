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
import { CoachAssessmentCallsPage } from "./coach-assessment-calls-page";
import { insertPaidClientRecords, type PaidClient } from "./paid-clients";
import { recordCreatedEmail } from "./clerk-users";
import { createE2eDatabasePool } from "./database";
import { requireEnv } from "./env";
import { PublicNav } from "./public-nav";
import { resolveRunId, runEmailPrefix } from "./run-id";
import { StripeCheckoutPage } from "./stripe-checkout";
import {
  cleanUpRecordedCheckoutSessions,
  registerCheckoutSessionForCleanup,
} from "./stripe-cleanup";

type PlatformFixtures = {
  siteOutOfWaitlistMode: void;
  publicNav: PublicNav;
  clientPortalShell: ClientPortalShell;
  clientOnboarding: ClientOnboarding;
  clientDashboard: ClientDashboard;
  accountPortal: AccountPortal;
  testEmail: string;
  visitorEmail: string;
  stripeCheckout: StripeCheckoutPage;
  registerCheckoutSessionForCleanup: (sessionId: string) => void;
  bookingPage: BookingPage;
  coachAssessmentCalls: CoachAssessmentCallsPage;
  createClerkUser: () => Promise<string>;
  // Inserts the accounts row directly because no entry point creates one yet.
  // Once the coach's invitation flow lands, arrange through it instead: sign
  // in as the bootstrap coach, invite testEmail, accept the invitation. That
  // removes databasePool and this INSERT from the suite.
  provisionAccount: (role: AccountRole) => Promise<void>;
  provisionPaidClient: (gender: VisitorGender) => Promise<PaidClient>;
  signIn: () => Promise<void>;
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
    await cleanUpRecordedCheckoutSessions(RUN_ID, "[e2e cleanup]");
  },

  bookingPage: async ({ page }, use) => {
    await use(new BookingPage(page));
  },

  coachAssessmentCalls: async ({ page }, use) => {
    await use(new CoachAssessmentCallsPage(page));
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
    await use(async (gender: VisitorGender) => {
      const authSubjectId = await createClerkUser();

      await databasePool.query(INSERT_ACCOUNT, [authSubjectId, "CLIENT"]);

      return insertPaidClientRecords(databasePool, {
        authSubjectId,
        email: testEmail,
        firstName: PAID_CLIENT_FIRST_NAME,
        lastName: PAID_CLIENT_LAST_NAME,
        gender,
      });
    });
  },

  signIn: async ({ publicNav, accountPortal, testEmail }, use) => {
    await use(async () => {
      await publicNav.openSignIn();
      await accountPortal.signInWithEmail(testEmail);
      await accountPortal.completeEmailOtp();
    });
  },
});

export { expect };
